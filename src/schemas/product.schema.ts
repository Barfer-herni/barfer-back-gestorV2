import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CreateCategoryDto } from '../modules/categories/dto/create-category.dto';
import { OptionDto } from '../modules/products/dto/option.dto';

@Schema({
  timestamps: true,
})
export class Product {
  @Prop({
    required: true,
    unique: true,
  })
  name: string;

  @Prop({
    required: true,
  })
  description: string;

  @Prop({
    required: false,
  })
  price?: number;

  @Prop({
    required: true,
  })
  category: CreateCategoryDto;

  @Prop({
    required: false,
  })
  stock?: number;

  @Prop({
    required: true,
  })
  images: string[];

  @Prop({
    required: false,
    default: [],
  })
  options?: OptionDto[];

  @Prop({
    required: false,
    default: 0,
  })
  salesCount?: number;

  @Prop({
    required: false,
    default: false,
  })
  sameDayDelivery?: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
