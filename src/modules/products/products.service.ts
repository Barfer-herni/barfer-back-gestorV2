import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Option } from 'src/schemas/option.schema';
import { DiscountDocument } from '../../schemas/discount.schema';
import { Product } from '../../schemas/product.schema';
import { CategoriesService } from '../categories/categories.service';
import { DiscountsService } from '../discounts/discounts.service';
import { OptionResponseDto } from '../options/dto/option-response.dto';
import { OptionsService } from '../options/options.service';
import { GoogleMerchantFeedItemDto } from './dto/google-merchant-feed.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly categoriesService: CategoriesService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => OptionsService))
    private optionService: OptionsService,
    private readonly discountsService: DiscountsService,
  ) {}

  async create(createProductDto: ProductDto) {
    const product: any = await this.findProductByName(createProductDto.name);
    if (product.message !== 'Product not found') {
      throw new BadRequestException('Product already exists');
    }

    if (!createProductDto.category)
      return new BadRequestException('Category can not be empty');

    const Icategory = await this.categoriesService.findOne(
      createProductDto.category,
    );

    const newProduct = new this.productModel({
      name: createProductDto.name,
      description: createProductDto.description,
      price: createProductDto.price,
      category: Icategory,
      stock: createProductDto.stock,
      images: createProductDto.images,
      sameDayDelivery: createProductDto.sameDayDelivery || false,
    });

    return await new this.productModel(newProduct).save();
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const productsFounded = await this.productModel
      .find({
        $or: [
          { sameDayDelivery: false },
          { sameDayDelivery: { $exists: false } },
        ],
      })
      .exec();

    if (!productsFounded) {
      throw new NotFoundException('Products not found');
    }

    const productsToReturn: ProductResponseDto[] = await Promise.all(
      productsFounded.map(async (product: any) => {
        const options = await this.optionService.findByProductId(
          product._id.toString(),
        );

        if (options) {
          product.options = await this.addDiscountsToOptions(options);
        }
        return product;
      }),
    );

    return productsToReturn;
  }

  async toProductResponseDto(
    product: Product & { _id: any },
  ): Promise<ProductResponseDto> {
    return {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
      images: product.images,
      options: product.options,
      salesCount: product.salesCount,
      sameDayDelivery: product.sameDayDelivery,
    } as ProductResponseDto;
  }

  async findProductByName(
    name: string,
  ): Promise<ProductResponseDto | NotFoundException> {
    const productFounded: ProductResponseDto = await this.productModel.findOne({
      name,
    });
    if (!productFounded) {
      return new NotFoundException('Product not found');
    }

    return productFounded;
  }

  async findOneById(id: string): Promise<ProductResponseDto> {
    const productFounded = await this.productModel.findById(id).exec();
    if (!productFounded) {
      throw new NotFoundException('Product not found');
    }

    const productToReturn: ProductResponseDto =
      await this.toProductResponseDto(productFounded);

    const options = await this.optionService.findByProductId(id);

    if (options) {
      productToReturn.options = await this.addDiscountsToOptions(options);
    }

    return productToReturn;
  }

  async findManyByIds(ids: string[]): Promise<ProductResponseDto[]> {
    const productsFounded = await this.productModel
      .find({ _id: { $in: ids } })
      .exec();
    if (!productsFounded) {
      throw new NotFoundException('Products not found');
    }

    const productsToReturn: ProductResponseDto[] = await Promise.all(
      productsFounded.map(async (product: any) => {
        const options = await this.optionService.findByProductId(
          product._id.toString(),
        );

        if (options) {
          product.options = await this.addDiscountsToOptions(options);
        }
        return product;
      }),
    );

    return productsToReturn;
  }

  async update(id: string, updateProductDto: ProductDto) {
    const product = await this.findOneById(id);

    if (!product) return new BadRequestException('Product not found');

    let Icategory = null;
    if (updateProductDto.category) {
      Icategory = await this.categoriesService.findOne(
        updateProductDto.category,
      );
    }

    const updatedProduct = {
      name: updateProductDto.name,
      description: updateProductDto.description,
      price: updateProductDto.price,
      category: Icategory,
      stock: updateProductDto.stock,
      images: updateProductDto.images,
      options: updateProductDto.options,
      salesCount: updateProductDto.salesCount,
      sameDayDelivery: updateProductDto.sameDayDelivery,
    };

    return await this.productModel
      .findByIdAndUpdate(id, updatedProduct, { new: true })
      .exec();
  }

  async remove(id: string) {
    const product = this.findOneById(id);
    if (!product) {
      return new NotFoundException('Product not found');
    }

    return this.productModel.findByIdAndDelete(id).exec();
  }

  async findByCategory(
    id: string,
    productType?: string,
  ): Promise<ProductResponseDto[]> {
    try {
      const baseQuery = { 'category._id': new Types.ObjectId(id) };
      let query: any = { ...baseQuery };

      if (productType === 'same-day') {
        query.sameDayDelivery = true;
      } else {
        query = {
          ...baseQuery,
          $or: [
            { sameDayDelivery: false },
            { sameDayDelivery: { $exists: false } },
          ],
        };
      }

      const products = await this.productModel
        .find(query)
        .populate('category')
        .exec();

      if (!products) {
        throw new NotFoundException('Products not found');
      }

      const productsToReturn: ProductResponseDto[] = await Promise.all(
        products.map(async (product: any) => {
          const options = await this.optionService.findByProductId(
            product._id.toString(),
          );

          if (options) {
            product.options = await this.addDiscountsToOptions(options);
          }
          return product;
        }),
      );

      return productsToReturn;
    } catch (error) {
      throw new BadRequestException('Category not found');
    }
  }

  async findAllSortingByPrice() {
    const products: any = await this.findAll();
    if (!products) {
      return new BadRequestException('Products not found');
    }

    const productsSorted = products.sort((a: any, b: any) => a.price - b.price);

    return productsSorted;
  }

  async updateOptions(id: string, options: string[]) {
    const product = await this.findOneById(id);
    if (!product) {
      return new BadRequestException('Product not found');
    }

    return await this.productModel
      .findByIdAndUpdate(id, { options }, { new: true })
      .populate('options')
      .exec();
  }

  async updateSalesCount(productId: string, quantity: number) {
    const product = await this.findOneById(productId);
    product.salesCount += quantity;
    await this.productModel.findByIdAndUpdate(productId, product, {
      new: true,
    });
  }

  async restoreSalesCount(productId: string, quantity: number) {
    const product = await this.findOneById(productId);
    product.salesCount -= quantity;
    await this.productModel.findByIdAndUpdate(productId, product, {
      new: true,
    });
  }

  async mostSold(): Promise<ProductResponseDto[]> {
    const productsFounded = await this.productModel
      .find()
      .sort({ salesCount: -1 })
      .limit(4)
      .exec();

    if (!productsFounded) {
      throw new NotFoundException('Products not found');
    }

    const productsToReturn: ProductResponseDto[] = await Promise.all(
      productsFounded.map(async (product: any) => {
        const option = await this.optionService.findByProductId(
          product._id.toString(),
        );
        if (option) {
          product.options = option;
        }
        return product;
      }),
    );

    return productsToReturn;
  }

  /**
   * Método privado para agregar descuentos a las opciones de un producto
   */
  private async addDiscountsToOptions(
    options: OptionResponseDto[],
  ): Promise<(OptionResponseDto & { discount?: any })[]> {
    const optionsWithDiscounts = [];
    const activeDiscounts = await this.discountsService.findActive();

    for (const option of options) {
      const optionDiscount = activeDiscounts.find((discount) =>
        discount.applicableOptionIds.some(
          (optionId) => optionId.toString() === option._id.toString(),
        ),
      ) as DiscountDocument;

      if (optionDiscount) {
        optionsWithDiscounts.push({
          ...option,
          discount: {
            id: optionDiscount._id.toString(),
            description: optionDiscount.description,
            initialQuantity: optionDiscount.initialQuantity,
            initialDiscountAmount: optionDiscount.initialDiscountAmount,
            additionalDiscountAmount: optionDiscount.additionalDiscountAmount,
            applicableOptionIds: optionDiscount.applicableOptionIds.map((id) =>
              id.toString(),
            ),
          },
        });
      } else {
        optionsWithDiscounts.push(option);
      }
    }

    return optionsWithDiscounts;
  }

  async findAllNonSameDayDelivery() {
    return this.productModel.find({ sameDayDelivery: false }).exec();
  }

  async findAllSameDayDelivery() {
    return this.productModel.find({ sameDayDelivery: true }).exec();
  }

  async findByType(type: string): Promise<ProductResponseDto[]> {
    let query = {};

    switch (type) {
      case 'same-day':
        query = { sameDayDelivery: true };
        break;
      case 'regular':
        query = {
          $or: [
            { sameDayDelivery: false },
            { sameDayDelivery: { $exists: false } },
          ],
        };
        break;
      case 'all':
        query = {};
        break;
      default:
        throw new BadRequestException(
          'Invalid product type. Valid types are: same-day, regular, all',
        );
    }

    const productsFounded = await this.productModel.find(query).exec();
    if (!productsFounded) {
      throw new NotFoundException('Products not found');
    }

    const productsToReturn: ProductResponseDto[] = await Promise.all(
      productsFounded.map(async (product: any) => {
        const options = await this.optionService.findByProductId(
          product._id.toString(),
        );

        if (options) {
          product.options = await this.addDiscountsToOptions(options);
        }
        return product;
      }),
    );

    return productsToReturn;
  }

  async getGoogleMerchantFeed(): Promise<GoogleMerchantFeedItemDto[]> {
    const allProducts = await this.productModel.find({}).exec();

    if (!allProducts || allProducts.length === 0) {
      return [];
    }

    const frontendBaseUrl = this.configService.get('env.frontend_base_url');
    const feedItems: GoogleMerchantFeedItemDto[] = [];
    
    allProducts.forEach((product: Product & { _id: Types.ObjectId }) => {
      const imageLink =
        product.images && product.images.length > 0 ? product.images[0] : '';

      const productLink = `${frontendBaseUrl}/tienda/${product._id}?producto=${encodeURIComponent(product.name)}`;

      if (product.options && product.options.length > 0) {
        product.options.forEach((option: Option & { _id: Types.ObjectId }) => {
          const availability = (option.stock && option.stock > 0) ? 'in stock' : 'out of stock';
          
          const priceFormatted = option.price ? `${option.price} ARS` : '0 ARS';
          
          const title = `${product.name} - ${option.name}`;
          
          const uniqueId = `${product._id.toString()}_${option._id.toString()}`;

          feedItems.push({
            id: uniqueId,
            title: title,
            description: product.description || '',
            link: productLink,
            image_link: imageLink,
            price: priceFormatted,
            availability: availability,
            condition: 'new',
          });
        });
      } else if (product.price) {
        const availability = (product.stock && product.stock > 0) ? 'in stock' : 'out of stock';
        const priceFormatted = `${product.price} ARS`;

        feedItems.push({
          id: product._id.toString(),
          title: product.name || '',
          description: product.description || '',
          link: productLink,
          image_link: imageLink,
          price: priceFormatted,
          availability: availability,
          condition: 'new',
        });
      }
    });

    return feedItems;
  }
}
