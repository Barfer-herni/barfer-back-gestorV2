import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Registro {
    BLANCO = 'BLANCO',
    NEGRO = 'NEGRO',
}


@Schema()
export class Proveedores extends Document {
    @Prop({
        type: String,
        enum: Registro,
        required: true
    })
    registro: Registro;

    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    detalle: string;

    @Prop({ required: true })
    telefono: string;

    @Prop({ required: true })
    personaContacto: string;

    @Prop({ required: true })
    categoriaId: string;

    @Prop({ required: true })
    metodoPagoId: string;

    @Prop({ required: true })
    isActive: boolean;

    @Prop({ required: true })
    createdAt: string;

    @Prop({ required: true })
    updateAt: string;


}

export const ProveedoresSchema = SchemaFactory.createForClass(Proveedores);
