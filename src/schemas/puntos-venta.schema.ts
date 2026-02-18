import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


@Schema()
export class PuntosVenta extends Document {

    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    zona: string;

    @Prop({ required: true })
    telefono: string;

    @Prop({ required: true })
    kgTotales: number;

    @Prop({ required: true })
    frecuenciaCompra: string;

    @Prop({ required: true })
    promedioKgPorPedido: number;

    @Prop({ required: true })
    kgUltimaCompra: number;

    @Prop({ required: true })
    totalPedidos: number;

    @Prop({ required: false })
    fechaPrimerPedido?: Date;

    @Prop({ required: false })
    fechaUltimoPedido?: Date;

}

export const PuntosVentaSchema = SchemaFactory.createForClass(PuntosVenta);
