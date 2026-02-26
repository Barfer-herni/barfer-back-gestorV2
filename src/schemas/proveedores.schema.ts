import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Registro {
    BLANCO = 'BLANCO',
    NEGRO = 'NEGRO',
}

@Schema()
export class Proveedores extends Document {
    @Prop({ type: String, enum: Registro, required: true })
    registro: Registro;

    @Prop({ type: String, required: true })
    nombre: string;

    @Prop({ type: String, required: true })
    detalle: string;

    @Prop({ type: String, required: true })
    telefono: string;

    @Prop({ type: String, required: true })
    personaContacto: string;

    @Prop({ type: String, default: null })
    categoriaId?: string | null;

    @Prop({ type: String, default: null })
    metodoPagoId?: string | null;

    @Prop({ type: Boolean, required: true, default: true })
    isActive: boolean;

    @Prop({ type: Date, required: true })
    createdAt: Date | string;

    @Prop({ type: Date, required: true })
    updatedAt: Date | string;
}

export const ProveedoresSchema = SchemaFactory.createForClass(Proveedores);
