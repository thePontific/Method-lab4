import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from '../services/products.service';
import { ProductResponseDto } from '../dto/product-response.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { ProductFiltersDto } from '../dto/product-filters.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getAllProducts(
    @Query() filters: ProductFiltersDto,
  ): Promise<ProductResponseDto[]> {
    return this.productsService.findAll(filters);
  }

  @Get(':id')
  async getProductById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductResponseDto> {
    return this.productsService.findById(id);
  }

  @Post()
  async createProduct(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.productsService.remove(id);
    return {
      message: `Товар с ID ${id} успешно удален`,
      status: 'success',
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException('Поддерживаются только изображения (jpg, jpeg, png, gif, webp)'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.productsService.uploadImage(id, image);
  }
}