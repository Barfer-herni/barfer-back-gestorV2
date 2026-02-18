import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class OrderDto {
  @IsOptional()
  @IsNumber()
  status?: number;

  @IsNotEmpty()
  @IsNumber()
  total?: number;

  @IsNotEmpty()
  @IsArray()
  items: {
    productId: string;
    options: {
      id: string;
      quantity: number;
    }[];
  }[];

  @IsNotEmpty()
  @IsNumber()
  subTotal?: number;

  @IsOptional()
  @IsNumber()
  shippingPrice?: number = 0;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsString()
  addressId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsNumber()
  paymentMethod: number;

  @IsOptional()
  @IsString()
  coupon: string | null;

  @IsOptional()
  @IsString()
  deliveryAreaId: string;

  @IsNotEmpty()
  @IsString()
  deliveryDate: string;
}
