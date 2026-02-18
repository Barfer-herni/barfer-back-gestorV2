import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { OptionDto } from './dto/option.dto';
import { InjectModel } from '@nestjs/mongoose';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { Model } from 'mongoose';
import { Option } from '../../schemas/option.schema';
import { ProductResponseDto } from '../products/dto/product-response.dto';
import { OptionResponseDto } from './dto/option-response.dto';

@Injectable()
export class OptionsService {
  constructor(
    @InjectModel(Option.name) private readonly optionModel: Model<Option>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ProductsService))
    private productService: ProductsService,
  ) {}

  async create(createOptionDto: OptionDto) {
    const options: string[] = [];
    const product: ProductResponseDto = await this.productService.findOneById(
      createOptionDto.productId,
    );
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const optionCreated = await new this.optionModel(createOptionDto).save();
    if (!optionCreated) {
      throw new BadRequestException('Option not created');
    }

    options.push(optionCreated._id.toString());

    await this.productService.updateOptions(createOptionDto.productId, options);

    return optionCreated;
  }

  async findByProductId(productId: string): Promise<OptionResponseDto[]> {
    const options: OptionResponseDto[] = (
      await this.optionModel.find({ productId }).exec()

    ).map((option) => ({...option.toObject(),
      _id: option._id.toString(),
    }));

    if (!options) {
      throw new BadRequestException('Options not found');
    }

    return options;
  }

  async findAll(): Promise<Option[]> {
    return await this.optionModel.find().exec();
  }

  async findOne(id: string): Promise<Option> {
    try {
      const option = await this.optionModel.findById(id).exec();
      if (!option) {
        throw new NotFoundException('Option not found');
      }

      return option;
    } catch (error) {
      throw new NotFoundException('Option not found');
    }
  }

  async update(id: string, updateOptionDto: OptionDto) {
    await this.findOne(id);

    return await this.optionModel
      .findByIdAndUpdate(id, updateOptionDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    const option = await this.findOne(id);
    if (option) {
      return await this.optionModel.findByIdAndDelete(id).exec();
    }
  }

  async findManyByIds(ids: string[]) {
    return await this.optionModel.find({ _id: { $in: ids } }).exec();
  }
}
