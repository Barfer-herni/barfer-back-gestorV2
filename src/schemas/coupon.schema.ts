import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { CouponType } from '../common/enums/coupons-types.enum';

/**
 * Coupon Schema
 *
 * Este esquema define la estructura de los cupones utilizados en la aplicación.
 *
 * Campos:
 * - count (number): Contador que lleva el número de veces que el cupón ha sido utilizado.
 * - code (string): Código único del cupón que será utilizado por los usuarios.
 * - limit (number): Número máximo de veces que el cupón puede ser utilizado en total.
 * - description (string): Descripción del cupón, explicando su uso o restricciones.
 * - type (string): Tipo de cupón, que puede ser 'fixed' (valor fijo) o 'percentage' (porcentaje de descuento).
 * - value (number): Valor asociado al cupón. Puede ser un monto fijo o un porcentaje, dependiendo del tipo.
 * - applicableProductOption (Types.ObjectId | null): ID de la opción de producto específica a la cual se aplica el cupón.
 *   Si es `null`, el cupón es aplicable a todos los productos.
 * - usedByUsers (Map<string, boolean>): Mapa que rastrea los usuarios que han utilizado el cupón.
 *   La clave es el `userId` y el valor es `true` si el usuario ya ha utilizado el cupón.
 *
 * Este esquema se utiliza para almacenar la información relacionada con los cupones y
 * gestionar su aplicabilidad y uso a nivel de usuario y opción de producto.
 */

export type CouponDocument = Coupon & Document;

@Schema({
  timestamps: true,
})
export class Coupon {
  @Prop({
    required: true,
    default: 0,
  })
  count: number;

  @Prop({
    required: true,
    type: String,
    unique: true,
  })
  code: string;

  @Prop({
    required: true,
  })
  limit: number;

  @Prop({
    required: true,
  })
  description: string;

  @Prop({
    required: true,
    enum: CouponType,
  })
  type: CouponType;

  @Prop({
    required: true,
  })
  value: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Option', // Referencia al esquema Option
    default: null,
  })
  applicableProductOption?: Types.ObjectId;

  @Prop({
    type: Number,
    default: 1,
  })
  maxAplicableUnits?: number; // Máximo de unidades a las que se aplicará el cupón

  @Prop({
    type: Map,
    of: Boolean,
    default: {},
  })
  usedByUsers: Map<string, boolean>;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
