# Методические указания по выполнению лабораторной работы №3

## Тема: Разработка REST API веб-сервиса для интернет-магазина на NestJS

### Оглавление

1. [Введение](#введение)
2. [Что такое API и REST](#что-такое-api-и-rest)
3. [Описание проекта](#описание-проекта)
4. [Установка проекта и настройка окружения](#установка-проекта-и-настройка-окружения)
5. [Структура проекта](#структура-проекта)
6. [Настройка подключения к PostgreSQL](#настройка-подключения-к-postgresql)
7. [Создание сущностей (Entity)](#создание-сущностей-entity)
8. [Создание DTO для валидации данных](#создание-dto-для-валидации-данных)
9. [Реализация репозитория для работы с БД](#реализация-репозитория-для-работы-с-бд)
10. [Сервис с бизнес-логикой](#сервис-с-бизнес-логикой)
11. [Контроллер и REST API маршруты](#контроллер-и-rest-api-маршруты)
12. [Валидация и глобальные пайпы](#валидация-и-глобальные-пайпы)
13. [Типовые ответы сервера и HTTP-коды](#типовые-ответы-сервера-и-http-коды)
14. [Тестирование API в Postman](#тестирование-api-в-postman)
15. [Обработка ошибок и коды ответов](#обработка-ошибок-и-коды-ответов)
16. [Полезные ссылки](#полезные-ссылки)

---

## 1. Введение

В этой лабораторной работе мы разработаем **REST API веб-сервис** для управления товарами интернет-магазина. В отличие от предыдущих работ, где мы использовали шаблонизацию для взаимодействия с пользователями, здесь мы сосредоточимся на **программном интерфейсе** для взаимодействия между приложениями.

Мы реализуем полный цикл **CRUD операций**:
- **Create** — создание нового товара
- **Read** — получение списка товаров или конкретного товара по ID
- **Update** — обновление существующего товара
- **Delete** — мягкое удаление товара

### Архитектурные слои проекта:

```
┌─────────────────────────────────────────┐
│           Контроллер (Controller)       │ ← HTTP-запросы, маршрутизация
│               @Controller()             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Сервис (Service)             │ ← Бизнес-логика, правила
│               @Injectable()             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          Репозиторий (Repository)       │ ← Работа с базой данных
│               @Injectable()             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Сущность (Entity)             │ ← Модель данных, структура таблицы
│               @Entity()                 │
└─────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          DTO (Data Transfer Object)     │ ← Валидация входных данных
│               class-validator            │
└─────────────────────────────────────────┘
```

---

## 2. Что такое API и REST

### 2.1 API (Application Programming Interface)
**API** — это набор правил и инструментов для взаимодействия программных компонентов. В контексте веб-разработки, API определяет способ, которым клиентские приложения могут взаимодействовать с сервером.

### 2.2 REST (Representational State Transfer)
**REST** — архитектурный стиль для распределенных систем, основанный на следующих принципах:

1. **Клиент-серверная архитектура** — разделение клиента и сервера
2. **Отсутствие состояния** — каждый запрос содержит всю необходимую информацию
3. **Кэширование** — ответы могут быть кэшированы
4. **Единообразие интерфейса** — стандартные HTTP-методы и форматы данных
5. **Слоистая система** — система может состоять из нескольких слоев

### 2.3 HTTP-методы в REST API:

| Метод   | Описание                     | Пример использования           |
|---------|------------------------------|--------------------------------|
| **GET**    | Получение ресурса            | `GET /api/products`            |
| **POST**   | Создание нового ресурса      | `POST /api/products`           |
| **PUT**    | Полное обновление ресурса    | `PUT /api/products/1`          |
| **DELETE** | Удаление ресурса             | `DELETE /api/products/1`       |
| **PATCH**  | Частичное обновление ресурса | `PATCH /api/products/1`        |

### 2.4 Форматы данных
В REST API данные передаются в формате **JSON** (JavaScript Object Notation):

```json
{
  "id": 1,
  "name": "Ноутбук ASUS VivoBook",
  "price": 54999,
  "category": "Электроника",
  "inStock": true
}
```

---

## 3. Описание проекта

Мы разрабатываем REST API для **интернет-магазина**. Каждый товар имеет следующие характеристики:

### Атрибуты товара:
- **id** — уникальный идентификатор (автоинкремент)
- **name** — название товара (строка, ≥3 символов)
- **description** — описание товара (опционально)
- **price** — цена товара (число, ≥0)
- **category** — категория товара (например, "Электроника", "Книги")
- **inStock** — наличие на складе (булево значение)
- **stockQuantity** — количество на складе (целое число, ≥0)
- **isDeleted** — флаг мягкого удаления (скрыто от клиента)
- **createdAt** — дата создания записи
- **updatedAt** — дата последнего обновления

### Бизнес-правила:
1. При `stockQuantity: 0` автоматически устанавливается `inStock: false`
2. Удаление товара происходит через мягкое удаление (`isDeleted: true`)
3. Удаленные товары не показываются в общих списках
4. Нельзя обновлять удаленные товары
5. Цена товара не может быть отрицательной

---

## 4. Установка проекта и настройка окружения

### 4.1 Установка NestJS CLI

```bash
# Установка NestJS CLI глобально
npm install -g @nestjs/cli

# Проверка установки
nest --version
```

### 4.2 Создание нового проекта

```bash
# Создание проекта
nest new bmstu-lab

# Выбор менеджера пакетов (выберите npm)
? Which package manager would you ❤️ to use?
  npm
  yarn
  pnpm

# Переход в папку проекта
cd bmstu-lab
```

### 4.3 Установка необходимых зависимостей

```bash
# Основные зависимости для REST API
npm install @nestjs/typeorm typeorm pg @nestjs/config
npm install class-validator class-transformer

# Разработческие зависимости
npm install --save-dev @types/node
```

### 4.4 Настройка Docker для PostgreSQL

Создайте файл `docker-compose.yml` в корне проекта:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: bmstu_postgres
    environment:
      POSTGRES_USER: bmstu_user
      POSTGRES_PASSWORD: bmstu_password
      POSTGRES_DB: bmstu_lab_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - bmstu_network

volumes:
  postgres_data:

networks:
  bmstu_network:
    driver: bridge
```

Создайте файл `init.sql` для инициализации базы данных:

```sql
-- Создание таблицы товаров
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставка тестовых данных
INSERT INTO products (name, description, price, category, stock_quantity) VALUES
    ('Ноутбук ASUS VivoBook', '15.6 дюймов, Intel Core i5, 8GB RAM, 512GB SSD', 54999, 'Электроника', 10),
    ('Смартфон Xiaomi Redmi Note', '6.7" AMOLED, 128GB, 5000mAh', 19999, 'Электроника', 15),
    ('Книга "Чистый код"', 'Роберт Мартин, руководство для разработчиков', 1499, 'Книги', 20),
    ('Кофемашина De''Longhi', 'Автоматическая кофемашина с капучинатором', 24999, 'Бытовая техника', 5),
    ('Наушники Sony WH-1000XM4', 'Беспроводные, шумоподавление', 24999, 'Электроника', 8);
```

---

## 5. Структура проекта

```
bmstu-lab/
├── src/
│   ├── entities/                          # Сущности базы данных
│   │   ├── product.entity.ts              # Товар
│   │   └── order.entity.ts                # Заказ (для будущего расширения)
│   ├── modules/                           # Функциональные модули
│   │   └── products/                      # Модуль товаров
│   │       ├── dto/                       # Data Transfer Objects
│   │       │   ├── create-product.dto.ts
│   │       │   ├── update-product.dto.ts
│   │       │   └── product-filters.dto.ts
│   │       ├── products.controller.ts     # REST API контроллер
│   │       ├── products.service.ts        # Сервис с бизнес-логикой
│   │       ├── products.module.ts         # Модуль
│   │       └── repositories/              # Репозиторий для работы с БД
│   │           └── typeorm-products.repository.ts
│   ├── app.module.ts                      # Корневой модуль приложения
│   └── main.ts                            # Точка входа
├── views/                                 # Шаблоны из предыдущих лабораторных
│   ├── partials/
│   │   ├── header.hbs
│   │   └── menu.hbs
│   ├── main.hbs
│   └── order.hbs
├── public/                                # Статические файлы
│   ├── style.css
│   └── img/
│       └── logo.png
├── .env                                   # Переменные окружения
├── .gitignore                             # Игнорируемые файлы
├── package.json                           # Зависимости проекта
├── tsconfig.json                          # Настройки TypeScript
├── nest-cli.json                          # Конфигурация Nest CLI
├── docker-compose.yml                     # Конфигурация Docker
└── init.sql                               # SQL для инициализации БД
```

---

## 6. Настройка подключения к PostgreSQL

### 6.1 Конфигурационный файл `.env`

Создайте файл `.env` в корне проекта:

```env
# Настройки базы данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=bmstu_user
DB_PASSWORD=bmstu_password
DB_DATABASE=bmstu_lab_db

# Настройки TypeORM
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Настройки приложения
PORT=3000
```

### 6.2 Конфигурация TypeORM в `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    // Загрузка переменных окружения
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Настройка подключения к PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'bmstu_user'),
        password: configService.get('DB_PASSWORD', 'bmstu_password'),
        database: configService.get('DB_DATABASE', 'bmstu_lab_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('DB_SYNCHRONIZE', 'true') === 'true',
        logging: configService.get('DB_LOGGING', 'true') === 'true',
      }),
      inject: [ConfigService],
    }),
    
    ProductsModule,
  ],
})
export class AppModule {}
```

### 6.3 Запуск базы данных

```bash
# Запуск PostgreSQL в Docker
docker-compose up -d

# Проверка статуса контейнера
docker-compose ps

# Просмотр логов
docker-compose logs -f postgres
```

---

## 7. Создание сущностей (Entity)

### 7.1 Сущность Product (Товар)

**Файл:** `src/entities/product.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'category', length: 100, nullable: true })
  category: string;

  @Column({ name: 'in_stock', default: true })
  inStock: boolean;

  @Column({ name: 'stock_quantity', default: 0 })
  stockQuantity: number;

  @Exclude()  // Не передается клиенту
  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 7.2 Объяснение декораторов TypeORM:

| Декоратор | Описание | Пример |
|-----------|----------|--------|
| `@Entity()` | Помечает класс как сущность базы данных | `@Entity('products')` |
| `@PrimaryGeneratedColumn()` | Автоинкрементный первичный ключ | `@PrimaryGeneratedColumn()` |
| `@Column()` | Обычное поле таблицы | `@Column({ length: 255 })` |
| `@CreateDateColumn()` | Автоматически заполняемая дата создания | `@CreateDateColumn()` |
| `@UpdateDateColumn()` | Автоматически обновляемая дата изменения | `@UpdateDateColumn()` |

### 7.3 Сущность Order (Заказ) для будущего расширения

**Файл:** `src/entities/order.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum OrderStatus {
  DRAFT = 'черновик',
  PENDING = 'ожидает',
  APPROVED = 'одобрена',
  REJECTED = 'отклонена',
  COMPLETED = 'завершена',
  DELETED = 'удалена',
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  status: OrderStatus;

  @Column({ nullable: true })
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ name: 'creator_id', default: 1 })
  creatorId: number;

  @Column({ name: 'moderator_id', nullable: true })
  moderatorId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'formed_at', type: 'timestamp', nullable: true })
  formedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;
}
```

---

## 8. Создание DTO для валидации данных

### 8.1 DTO для создания товара

**Файл:** `src/modules/products/dto/create-product.dto.ts`

```typescript
import { IsString, IsNumber, Min, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(3, { message: 'Название должно быть не менее 3 символов' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0, { message: 'Цена не может быть отрицательной' })
  price: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean = true;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number = 0;
}
```

### 8.2 DTO для обновления товара

**Файл:** `src/modules/products/dto/update-product.dto.ts`

```typescript
import { IsString, IsNumber, Min, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;
}
```

### 8.3 DTO для фильтрации товаров

**Файл:** `src/modules/products/dto/product-filters.dto.ts`

```typescript
import { IsOptional, IsString, IsNumber, Min, IsBoolean } from 'class-validator';

export class ProductFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;
}
```

### 8.4 Объяснение декораторов class-validator:

| Декоратор | Описание | Пример |
|-----------|----------|--------|
| `@IsString()` | Проверяет, что значение - строка | `@IsString()` |
| `@IsNumber()` | Проверяет, что значение - число | `@IsNumber()` |
| `@IsBoolean()` | Проверяет, что значение - булево | `@IsBoolean()` |
| `@Min()` | Проверяет минимальное значение | `@Min(0)` |
| `@MinLength()` | Проверяет минимальную длину строки | `@MinLength(3)` |
| `@IsOptional()` | Поле является опциональным | `@IsOptional()` |

---

## 9. Реализация репозитория для работы с БД

**Файл:** `src/modules/products/repositories/typeorm-products.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../../entities/product.entity';
import { ProductFiltersDto } from '../dto/product-filters.dto';

@Injectable()
export class TypeORMProductsRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private repository: Repository<ProductEntity>,
  ) {}

  async findAll(filters?: ProductFiltersDto): Promise<ProductEntity[]> {
    const query = this.repository.createQueryBuilder('product');

    // Не показываем удаленные по умолчанию
    if (!filters?.includeDeleted) {
      query.where('product.is_deleted = false');
    }

    // Поиск по названию и описанию (регистронезависимый)
    if (filters?.search) {
      query.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    // Фильтрация по категории
    if (filters?.category) {
      query.andWhere('product.category = :category', {
        category: filters.category,
      });
    }

    // Фильтрация по наличию
    if (filters?.inStock !== undefined) {
      query.andWhere('product.in_stock = :inStock', {
        inStock: filters.inStock,
      });
    }

    // Фильтрация по цене
    if (filters?.minPrice !== undefined) {
      query.andWhere('product.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters?.maxPrice !== undefined) {
      query.andWhere('product.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    return await query.getMany();
  }

  async findById(id: number): Promise<ProductEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async create(data: Partial<ProductEntity>): Promise<ProductEntity> {
    const product = this.repository.create(data);
    return await this.repository.save(product);
  }

  async update(id: number, data: Partial<ProductEntity>): Promise<ProductEntity> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) throw new Error('Product not found after update');
    return updated;
  }

  async softDelete(id: number): Promise<void> {
    await this.repository.update(id, {
      isDeleted: true,
      inStock: false,
    });
  }
}
```

### 9.1 Объяснение QueryBuilder:

```typescript
// Создание запроса
const query = this.repository.createQueryBuilder('product');

// Добавление условий WHERE
query.where('product.is_deleted = false');

// Добавление условий AND WHERE
query.andWhere('product.price >= :minPrice', {
  minPrice: filters.minPrice,
});

// Выполнение запроса
return await query.getMany();
```

---

## 10. Сервис с бизнес-логикой

**Файл:** `src/modules/products/products.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TypeORMProductsRepository } from './repositories/typeorm-products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: TypeORMProductsRepository,
  ) {}

  async findAll(filters: ProductFiltersDto) {
    // Бизнес-правило 1: по умолчанию не показываем удаленные товары
    if (filters.includeDeleted === undefined) {
      filters.includeDeleted = false;
    }
    
    return await this.productsRepository.findAll(filters);
  }

  async findOne(id: number) {
    const product = await this.productsRepository.findById(id);
    
    if (!product) {
      throw new NotFoundException(`Товар с ID ${id} не найден`);
    }
    
    // Бизнес-правило 2: не отдаем удаленные товары
    if (product.isDeleted) {
      throw new NotFoundException(`Товар с ID ${id} удален`);
    }
    
    return product;
  }

  async create(createProductDto: CreateProductDto) {
    // Бизнес-правило 3: если количество = 0, то товар не в наличии
    if (createProductDto.stockQuantity === 0) {
      createProductDto.inStock = false;
    }
    
    return await this.productsRepository.create(createProductDto);
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    // Проверяем существование товара
    await this.findOne(id);
    
    const product = await this.productsRepository.findById(id);
    if (product?.isDeleted) {
      throw new BadRequestException('Нельзя обновлять удаленный товар');
    }
    
    // Бизнес-правило 4: синхронизация наличия и количества
    if (updateProductDto.stockQuantity !== undefined) {
      updateProductDto.inStock = updateProductDto.stockQuantity > 0;
    }
    
    return await this.productsRepository.update(id, updateProductDto);
  }

  async remove(id: number) {
    // Проверяем существование
    await this.findOne(id);
    
    // Бизнес-правило 5: мягкое удаление
    await this.productsRepository.softDelete(id);
  }
}
```

### 10.1 Бизнес-правила сервиса:

1. **Правило видимости**: Удаленные товары (`isDeleted: true`) не показываются в списках
2. **Правило доступа**: Нельзя получить информацию об удаленном товаре
3. **Правило наличия**: При нулевом количестве товар автоматически помечается как отсутствующий
4. **Правило обновления**: Нельзя обновлять удаленные товары
5. **Правило синхронизации**: Изменение количества автоматически влияет на наличие

### 10.2 Исключения (Exceptions):

| Исключение | Код HTTP | Когда вызывается |
|------------|----------|------------------|
| `NotFoundException` | 404 | Товар не найден или удален |
| `BadRequestException` | 400 | Неправильные данные или попытка обновить удаленный товар |

---

## 11. Контроллер и REST API маршруты

**Файл:** `src/modules/products/products.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() filters: ProductFiltersDto) {
    return this.productsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}
```

### 11.1 Маршруты API:

| Метод | URL | Параметры | Описание |
|-------|-----|-----------|----------|
| **GET** | `/api/products` | `?search=`, `?category=`, `?minPrice=`, `?maxPrice=`, `?inStock=` | Получение списка товаров с фильтрацией |
| **GET** | `/api/products/:id` | `:id` - ID товара | Получение конкретного товара |
| **POST** | `/api/products` | Тело запроса в JSON | Создание нового товара |
| **PUT** | `/api/products/:id` | `:id` - ID товара, тело запроса в JSON | Обновление существующего товара |
| **DELETE** | `/api/products/:id` | `:id` - ID товара | Мягкое удаление товара |

### 11.2 Примеры запросов с фильтрацией:

```bash
# Все товары
GET /api/products

# Товары в категории "Электроника"
GET /api/products?category=Электроника

# Товары с поиском по слову "ноутбук"
GET /api/products?search=ноутбук

# Товары в наличии ценой от 10000 до 50000
GET /api/products?inStock=true&minPrice=10000&maxPrice=50000

# Все товары включая удаленные
GET /api/products?includeDeleted=true
```

---

## 12. Валидация и глобальные пайпы

### 12.1 Настройка глобальной валидации в `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальная валидация DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Удаляет поля, не описанные в DTO
    forbidNonWhitelisted: true, // Выбрасывает ошибку при наличии лишних полей
    transform: true,           // Автоматическое преобразование типов
    transformOptions: {
      enableImplicitConversion: true, // Неявное преобразование типов
    },
  }));

  // Интерцептор для скрытия полей с @Exclude()
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  await app.listen(3000);
  console.log(`Application is running on: http://localhost:3000`);
}
bootstrap();
```

### 12.2 Параметры ValidationPipe:

| Параметр | Значение по умолчанию | Описание |
|----------|----------------------|----------|
| `whitelist` | `false` | Удаляет поля, не описанные в DTO |
| `forbidNonWhitelisted` | `false` | Выбрасывает ошибку при лишних полях |
| `transform` | `false` | Преобразует типы данных |
| `disableErrorMessages` | `false` | Отключает сообщения об ошибках |

---

## 13. Типовые ответы сервера и HTTP-коды

### 13.1 Успешные ответы:

| Код | Название | Описание | Пример использования |
|-----|----------|----------|----------------------|
| **200** | OK | Успешный запрос | `GET /api/products`, `PUT /api/products/1` |
| **201** | Created | Ресурс успешно создан | `POST /api/products` |
| **204** | No Content | Ресурс успешно удален | `DELETE /api/products/1` |

### 13.2 Пример успешного ответа:

```json
{
  "id": 1,
  "name": "Ноутбук ASUS VivoBook",
  "description": "15.6 дюймов, Intel Core i5, 8GB RAM, 512GB SSD",
  "price": 54999,
  "category": "Электроника",
  "inStock": true,
  "stockQuantity": 10,
  "createdAt": "2025-12-09T20:30:00.000Z",
  "updatedAt": "2025-12-09T20:30:00.000Z"
}
```

---

## 14. Тестирование API в Postman

### 14.1 Установка Postman

1. Скачайте Postman с официального сайта: https://www.postman.com/downloads/
2. Установите и создайте учетную запись
3. Создайте новую коллекцию "BMSTU Lab 3"

### 14.2 Тестовые сценарии

#### Сценарий 1: Создание товара

**Запрос:**
```
POST http://localhost:3000/api/products
Content-Type: application/json

{
  "name": "Ноутбук ASUS VivoBook 15",
  "description": "15.6 дюймов, Intel Core i5, 8GB RAM, 512GB SSD",
  "price": 54999,
  "category": "Электроника",
  "stockQuantity": 10
}
```

**Ожидаемый ответ (201 Created):**
```json
{
  "id": 1,
  "name": "Ноутбук ASUS VivoBook 15",
  "description": "15.6 дюймов, Intel Core i5, 8GB RAM, 512GB SSD",
  "price": 54999,
  "category": "Электроника",
  "inStock": true,
  "stockQuantity": 10,
  "createdAt": "2025-12-09T20:30:00.000Z",
  "updatedAt": "2025-12-09T20:30:00.000Z"
}
```

#### Сценарий 2: Получение списка товаров

**Запрос:**
```
GET http://localhost:3000/api/products
```

**Ожидаемый ответ (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Ноутбук ASUS VivoBook 15",
    "description": "15.6 дюймов, Intel Core i5, 8GB RAM, 512GB SSD",
    "price": 54999,
    "category": "Электроника",
    "inStock":
