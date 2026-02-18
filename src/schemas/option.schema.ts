import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OptionDocument = Option & Document;

@Schema({
  timestamps: true,
})
export class Option {
  @Prop({
    required: true,
  })
  name: string;

  @Prop({
    required: false,
  })
  description: string;

  @Prop({
    required: true,
  })
  stock: number;

  @Prop({
    required: true,
  })
  price: number;

  @Prop({
    required: true,
  })
  productId: string;
}

export const OptionSchema = SchemaFactory.createForClass(Option);
