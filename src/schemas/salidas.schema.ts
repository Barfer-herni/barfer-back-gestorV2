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
    @Prop({ required: true })
    fechaFactura: Date | string;

    @Prop({ required: true })
    detalle: string;

    @Prop({ required: true })
    tipo: Tipo;

    @Prop({ required: true })
    marca?: string | null;

    @Prop({ required: true })
    monto: number;

    @Prop({ required: true })
    tipoRegistro: TipoRegistro;

    @Prop({ required: true })
    categoriaId: string;

    @Prop({ required: true })
    metodoPagoId: string;

    @Prop({ required: true })
    proveedorId?: string | null;

    @Prop({ required: true })
    fechaPago?: Date | string | null;

    @Prop({ required: true })
    comprobanteNumber?: string | null;

    @Prop({ required: true })
    createdAt: Date | string;

    @Prop({ required: true })
    updateAt: Date | string;

}

export const SalidasSchema = SchemaFactory.createForClass(Salidas);

