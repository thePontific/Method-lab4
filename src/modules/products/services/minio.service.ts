import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioSimpleService {
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET')!;
    
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT')!,
      port: this.configService.get<number>('MINIO_PORT')!,
      useSSL: this.configService.get<string>('MINIO_USE_SSL')! === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY')!,
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY')!,
    });

    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        console.log(`Бакет "${this.bucketName}" создан в MinIO`);
      }
    } catch (error) {
      console.error('Ошибка при инициализации бакета MinIO:', error.message);
    }
  }

  async uploadProductImage(file: Buffer, productId: number): Promise<string> {
    const fileName = `product-${productId}-${Date.now()}.jpg`;
    
    await this.minioClient.putObject(
      this.bucketName,
      fileName,
      file,
      file.length,
      { 'Content-Type': 'image/jpeg' }
    );

    const protocol = this.configService.get<string>('MINIO_USE_SSL') === 'true' ? 'https' : 'http';
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port = this.configService.get<number>('MINIO_PORT');
    
    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${fileName}`;
  }

  async getSignedUrl(fileName: string | undefined): Promise<string | null> {
    if (!fileName) {
      return null;
    }
    
    // 7 дней = 7 * 24 * 60 * 60 секунд
    const expiresIn = 7 * 24 * 60 * 60;
    
    try {
      const signedUrl = await this.minioClient.presignedGetObject(
        this.bucketName,
        fileName,
        expiresIn
      );
      return signedUrl;
    } catch (error) {
      console.error('Ошибка при генерации подписанной ссылки:', error.message);
      return null;
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, fileName);
    } catch (error) {
      console.error('Ошибка при удалении файла из MinIO:', error.message);
      throw error;
    }
  }
}