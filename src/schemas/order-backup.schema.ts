import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: true,
})
export class OrderBackup {
  @Prop({ required: true, type: Types.ObjectId })
  originalOrderId: Types.ObjectId;

  @Prop({ required: true, type: Object })
  orderData: Record<string, any>;

  @Prop({ required: true })
  action: string; // 'update' | 'delete'
}

export const OrderBackupSchema = SchemaFactory.createForClass(OrderBackup);
