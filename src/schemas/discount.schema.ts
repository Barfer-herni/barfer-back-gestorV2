import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DiscountDocument = Discount & Document;

@Schema({ timestamps: true })
export class Discount {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Option' }], required: true })
  applicableOptionIds: Types.ObjectId[];

  @Prop({ required: true })
  initialQuantity: number;

  @Prop({ required: true })
  initialDiscountAmount: number;

  @Prop({ required: true })
  additionalDiscountAmount: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const DiscountSchema = SchemaFactory.createForClass(Discount); 