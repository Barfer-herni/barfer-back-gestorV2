import { forwardRef, Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../../schemas/product.schema';
import { CategoriesModule } from '../categories/categories.module';
import { OptionsModule } from '../options/options.module';
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, MongooseModule],
  imports: [
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]),
    forwardRef(() => OptionsModule),
    forwardRef(() => CategoriesModule),
    DiscountsModule,
  ],
})
export class ProductsModule {}
