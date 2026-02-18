import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum WeekDay {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

@Schema({
  timestamps: true,
})
export class DeliveryArea {
  @Prop({ required: true })
  description: string;

  @Prop({ type: [[Number]], required: true })
  coordinates: number[][];

  @Prop({ required: false })
  sheetName: string;

  @Prop({ required: true })
  schedule: string;

  @Prop({ default: 0 })
  orderCutOffHour: number;

  @Prop({ default: false })
  sameDayDelivery: boolean;

  @Prop({ type: [String], enum: WeekDay, default: [] })
  sameDayDeliveryDays: WeekDay[];

  @Prop()
  whatsappNumber: string;

  @Prop({ default: true })
  enabled: boolean;
}

export const DeliveryAreaSchema = SchemaFactory.createForClass(DeliveryArea);
