import { Module, forwardRef } from '@nestjs/common';
import { OptionsService } from './options.service';
import { OptionsController } from './options.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Option, OptionSchema } from '../../schemas/option.schema';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Option.name,
        schema: OptionSchema,
      },
    ]),
    forwardRef(() => ProductsModule),
  ],
  controllers: [OptionsController],
  providers: [OptionsService],
  exports: [OptionsService],
})
export class OptionsModule {}
