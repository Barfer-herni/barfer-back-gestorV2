import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class PaymentsGestor extends Document {
    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    isActive: boolean;

    @Prop({ required: true })
    createAt: string;

    @Prop({ required: true })
    updateAt: string;
}

export const PaymentsGestorSchema = SchemaFactory.createForClass(PaymentsGestor);
