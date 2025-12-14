import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { TypeORMProductsRepository } from '../repositories/typeorm-products.repository';
import { ProductResponseDto } from '../dto/product-response.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { ProductFiltersDto } from '../dto/product-filters.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { MinioSimpleService } from './minio.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: TypeORMProductsRepository,
    private minioService: MinioSimpleService,
  ) {}

  async findAll(filters: ProductFiltersDto): Promise<ProductResponseDto[]> {
    // по умолчанию не показываем удалённые
    if (filters.includeDeleted === undefined) {
      filters.includeDeleted = false;
    }

    const products = await this.productsRepository.findAll(filters);

    // Для каждого продукта с изображением генерируем подписанную ссылку
    const productsWithSignedUrls = await Promise.all(
      products.map(async (product) => {
        if (product.imageUrl) {
          const fileName = product.imageUrl.split('/').pop();
          try {
            const signedUrl = await this.minioService.getSignedUrl(fileName);
            if (signedUrl) {
              product.imageUrl = signedUrl;
            } else {
              delete product.imageUrl;
            }
          } catch (error) {
            console.warn(`Не удалось получить ссылку для файла:`, error);
            delete product.imageUrl;
          }
        }

        const { isDeleted, ...productData } = product;
        return productData as ProductResponseDto;
      })
    );

    return productsWithSignedUrls;
  }

  async findById(id: number): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findById(id);

    if (!product || product.isDeleted) {
      throw new NotFoundException(`Товар с ID ${id} не найден`);
    }

    // Генерируем подписанную ссылку для изображения
    if (product.imageUrl) {
      const fileName = product.imageUrl.split('/').pop();
      try {
        const signedUrl = await this.minioService.getSignedUrl(fileName);
        if (signedUrl) {
          product.imageUrl = signedUrl;
        } else {
          delete product.imageUrl;
        }
      } catch (error) {
        delete product.imageUrl;
      }
    }

    const { isDeleted, ...productData } = product;
    return productData as ProductResponseDto;
  }

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    if (createProductDto.stockQuantity === 0) {
      createProductDto.inStock = false;
    }

    const product = await this.productsRepository.create(createProductDto);
    const { isDeleted, ...productData } = product;

    return productData as ProductResponseDto;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Товар с ID ${id} не найден`);
    }

    if (product.isDeleted) {
      throw new BadRequestException('Нельзя обновлять удалённый товар');
    }

    if (updateProductDto.stockQuantity !== undefined) {
      updateProductDto.inStock = updateProductDto.stockQuantity > 0;
    }

    const updatedProduct = await this.productsRepository.update(
      id,
      updateProductDto,
    );

    // Генерируем подписанную ссылку для обновленного продукта
    if (updatedProduct.imageUrl) {
      const fileName = updatedProduct.imageUrl.split('/').pop();
      try {
        const signedUrl = await this.minioService.getSignedUrl(fileName);
        if (signedUrl) {
          updatedProduct.imageUrl = signedUrl;
        } else {
          delete updatedProduct.imageUrl;
        }
      } catch (error) {
        delete updatedProduct.imageUrl;
      }
    }

    const { isDeleted, ...productData } = updatedProduct;
    return productData as ProductResponseDto;
  }

  async remove(id: number): Promise<void> {
    const product = await this.productsRepository.findById(id);

    if (!product || product.isDeleted) {
      throw new NotFoundException(`Товар с ID ${id} не найден`);
    }

    await this.productsRepository.softDelete(id);
  }

  async uploadImage(
    id: number,
    file: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    // Проверяем существование товара
    const product = await this.productsRepository.findById(id);
    
    if (!product || product.isDeleted) {
      throw new NotFoundException(`Товар с ID ${id} не найден`);
    }

    // Проверяем файл
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Файл должен быть изображением');
    }

    try {
      // Удаляем старое изображение, если оно существует
      if (product.imageUrl) {
        await this.deleteOldImage(product.imageUrl);
      }

      // Загружаем новое изображение в MinIO
      const imageUrl = await this.minioService.uploadProductImage(
        file.buffer,
        id,
      );

      // Обновляем запись товара с новым URL изображения
      const updatedProduct = await this.productsRepository.update(id, {
        imageUrl,
      });

      // Генерируем подписанную ссылку для нового изображения
      if (updatedProduct.imageUrl) {
        const fileName = updatedProduct.imageUrl.split('/').pop();
        try {
          const signedUrl = await this.minioService.getSignedUrl(fileName);
          if (signedUrl) {
            updatedProduct.imageUrl = signedUrl;
          } else {
            delete updatedProduct.imageUrl;
          }
        } catch (error) {
          delete updatedProduct.imageUrl;
        }
      }

      const { isDeleted, ...productData } = updatedProduct;
      return productData as ProductResponseDto;
    } catch (error) {
      console.error('Ошибка при загрузке изображения:', error);
      throw new InternalServerErrorException('Не удалось загрузить изображение');
    }
  }

  private async deleteOldImage(imageUrl: string): Promise<void> {
    try {
      // Извлекаем имя файла из URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      // Удаляем файл из MinIO
      await this.minioService.deleteFile(fileName);
    } catch (error) {
      console.warn('Не удалось удалить старое изображение:', error.message);
      // Не выбрасываем ошибку, так как это не критично
    }
  }
}