import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from '../../schemas/category.schema';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Product } from '../../schemas/product.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>, // Añadir el modelo de Product
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const category = await this.findCategoryByName(createCategoryDto.name);
    if (category) {
      throw new BadRequestException('Category already exists');
    }

    return await new this.categoryModel(createCategoryDto).save();
  }

  async findAll() {
    const dataFromLocalCache = await this.cacheManager.get(`categories`);
    if (dataFromLocalCache) {
      return dataFromLocalCache;
    }

    const categories = await this.categoryModel.find({}).exec();
    await this.cacheManager.set(`categories`, categories, 120000);

    return categories;
  }

  async findOne(id: string) {
    try {
      const category = await this.categoryModel.findById(id).exec();
      if (!category) {
        throw new BadRequestException('Category not found');
      }
      return category;
    } catch (error) {
      throw new NotFoundException('Category not found');
    }
  }

  async findOneByName(name: string) {
    try {
      const category = await this.categoryModel.findOne({ name }).exec();
      if (!category) {
        throw new BadRequestException('Category not found');
      }
      return category;
    } catch (error) {
      throw new NotFoundException('Category not found');
    }
  }

  async update(id: string, updatedCategory: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Actualizar los campos
    if (updatedCategory.name) {
      category.name = updatedCategory.name;
    }
    if (updatedCategory.description) {
      category.description = updatedCategory.description;
    }

    return await category.save();
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    if (!category) {
      return new BadRequestException('Category not found');
    }

    return await this.categoryModel.findByIdAndDelete(id).exec();
  }

  async findCategoryByName(name: string) {
    const dataFromLocalCache = await this.cacheManager.get(
      `${name}:categories`,
    );
    if (dataFromLocalCache) {
      return dataFromLocalCache;
    }

    const category = await this.categoryModel.findOne({ name }).exec();
    await this.cacheManager.set(`${name}:categories`, category, 120000);

    return category;
  }
}
