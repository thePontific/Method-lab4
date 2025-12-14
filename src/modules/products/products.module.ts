import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../../entities/product.entity';
import { ProductsController } from './controllers/products.controller';
import { ProductsService } from './services/products.service';
import { TypeORMProductsRepository } from './repositories/typeorm-products.repository';
import { MinioSimpleService } from './services/minio.service'; // Добавьте этот импорт

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    TypeORMProductsRepository,
    MinioSimpleService, // Добавьте сюда
  ],
  exports: [ProductsService],
})
export class ProductsModule {}