import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AddressDto } from '../modules/address/dto/address.dto';
import { UserDto } from '../modules/users/dto/user.dto';
import { ProductDto } from '../modules/products/dto/product.dto';
import { DeliveryAreaDto } from '../modules/delivery-areas/dto/delivery-area.dto';

@Schema({
  timestamps: true,
})
export class Order {
  @Prop({
    required: true,
  })
  status: string;

  @Prop({
    required: true,
  })
  total: number;

  @Prop({
    required: true,
  })
  items: ProductDto[];

  @Prop({
    required: false,
    default: 0,
  })
  subTotal: number;

  @Prop({
    required: false,
    default: 0,
  })
  shippingPrice?: number;

  @Prop({
    required: false,
    default: '',
  })
  notes: string;

  @Prop({
    required: true,
  })
  address: AddressDto;

  @Prop({
    required: true,
  })
  user: UserDto;

  @Prop({
    required: true,
  })
  paymentMethod: string;

  @Prop({
    required: false,
  })
  paymentMethodDiscount: number;

  @Prop({
    isOptional: true,
  })
  coupon?: string;

  @Prop({
    required: false,
    default: 0,
  })
  couponDiscount?: number;

  @Prop({
    isOptional: true,
  })
  deliveryArea?: DeliveryAreaDto;

  // New field: deliveryDate
  @Prop({
    required: false,
  })
  deliveryDate?: string;

  // New field: deliveryDay as Date format
  @Prop({
    required: false,
  })
  deliveryDay?: Date;

  // New field: orderType
  @Prop({
    required: false,
  })
  orderType?: string;

  // New field: whatsappContactedAt
  @Prop({
    required: false,
  })
  whatsappContactedAt?: string;

  @Prop({
    required: false,
  })
  puntoEnvio?: string;

  @Prop({
    required: false,
  })
  estadoEnvio?: string;

  @Prop({
    required: false,
  })
  notesOwn?: string;

  @Prop({
    required: false,
  })
  punto_de_venta?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ deliveryDay: -1 });
OrderSchema.index({ 'user.email': 1 });
