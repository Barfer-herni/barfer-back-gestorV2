import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'metodos_pago' })
export class MetodoPago extends Document {
    @Prop({ required: true, unique: true, uppercase: true, trim: true })
    nombre: string;

    @Prop({ required: false, default: null })
    descripcion: string | null;

    @Prop({ required: true, default: true })
    isActive: boolean;
}

export const MetodoPagoSchema = SchemaFactory.createForClass(MetodoPago);
