import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Stock extends Document {

    @Prop({ required: true })
    puntoEnvio: string;

    @Prop({ required: true })
    section?: string;

    @Prop({ required: true })
    producto: string;

    @Prop({ required: true })
    peso?: string;

    @Prop({ required: true })
    stockInicial: number;

    @Prop({ required: true })
    llevamos: number;

    @Prop({ required: true })
    pedidosDelDia: number;

    @Prop({ required: true })
    stockFinal: number;

    @Prop({ required: true })
    fecha: string;

    @Prop({ required: true })
    createdAt: string;

    @Prop({ required: true })
    updatedAt: string;

}

export const StockSchema = SchemaFactory.createForClass(Stock);
