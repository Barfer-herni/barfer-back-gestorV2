import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';


export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum OrderType {
  MINORISTA = 'minorista',
  MAYORISTA = 'mayorista',
}

export enum PaymentMethod {
  MERCADO_PAGO = 'mercado-pago',
  CASH = 'cash',
}

export class OrderDto {
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsNotEmpty()
  @IsNumber()
  total: number;

  @IsOptional()
  @IsNumber()
  subTotal: number;

  @IsOptional()
  @IsNumber()
  shippingPrice: number;

  @IsOptional()
  @IsString()
  notes: string;

  @IsOptional()
  @IsString()
  notesOwn: string;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNotEmpty()
  @IsEnum(OrderType)
  orderType: OrderType;

  @IsOptional()
  @IsString()
  punto_de_venta: string;

  @IsOptional()
  @IsString()
  puntoEnvio: string;

  @IsNotEmpty()
  @IsObject()
  address: {
    address: string;
    city: string;
    phone: string;
    betweenStreets?: string;
    floorNumber?: string;
    departmentNumber?: string;
  };

  @IsNotEmpty()
  @IsObject()
  user: {
    name: string;
    lastName: string;
    email?: string;
  };

  @IsNotEmpty()
  @IsArray()
  items: {
    id: string;
    name: string;
    description?: string;
    images?: string[];
    options: {
      name: string;
      price: number;
      quantity: number;
    }[];
    price: number;
    salesCount?: number;
    discountApllied?: number;
  }[];

  @IsNotEmpty()
  @IsObject()
  deliveryArea: {
    _id?: string;
    description: string;
    coordinates: number[][];
    schedule: string;
    orderCutOffHour: number;
    enabled: boolean;
    sameDayDelivery: boolean;
    sameDayDeliveryDays: string[];
    whatsappNumber?: string;
    sheetName?: string;
  };

  @IsOptional()
  @IsObject()
  coupon: {
    code: string;
    discount: number;
    type: string;
  };

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  deliveryDay: Date;

}