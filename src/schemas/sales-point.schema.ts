import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
})
export class SalesPoint extends Document {
  @Prop({
    required: true,
  })
  name: string;

  @Prop({
    required: true,
  })
  address: string;

  @Prop({
    required: true,
  })
  contact: string;

  @Prop({
    required: false,
  })
  ig: string;

  @Prop({
    required: true,
  })
  region: string;

  @Prop({
    required: false,
  })
  hours: string;

  @Prop({
    required: true,
    type: Number,
  })
  latitude: number;

  @Prop({
    required: true,
    type: Number,
  })
  longitude: number;
}

export const SalesPointSchema = SchemaFactory.createForClass(SalesPoint);
