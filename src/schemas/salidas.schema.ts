import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Tipo {
    ORDINARIO = 'ORDINARIO',
    EXTRAORDINARIO = 'EXTRAORDINARIO',
}

export enum TipoRegistro {
    BLANCO = 'BLANCO',
    NEGRO = 'NEGRO',
}

@Schema()
export class Salidas extends Document {
    @Prop({ type: Date, required: true })
    fechaFactura: Date | string;

    @Prop({ type: String, required: true })
    detalle: string;

    @Prop({ type: String, enum: Tipo, required: true })
    tipo: Tipo;

    @Prop({ type: String, default: null })
    marca?: string | null;

    @Prop({ type: Number, required: true })
    monto: number;

    @Prop({ type: String, enum: TipoRegistro, required: true })
    tipoRegistro: TipoRegistro;

    @Prop({ type: String, required: true })
    categoriaId: string;

    @Prop({ type: String, required: true })
    metodoPagoId: string;

    @Prop({ type: String, default: null })
    proveedorId?: string | null;

    @Prop({ type: Date, default: null })
    fechaPago?: Date | string | null;

    @Prop({ type: String, default: null })
    comprobanteNumber?: string | null;

    @Prop({ type: Date, required: true })
    createdAt: Date | string;

    @Prop({ type: Date, required: true })
    updatedAt: Date | string;
}

export const SalidasSchema = SchemaFactory.createForClass(Salidas);
