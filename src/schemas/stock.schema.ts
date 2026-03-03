import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'stock' })
export class Stock extends Document {

    @Prop({ type: String, required: true })
    puntoEnvio: string;

    @Prop({ required: true })
    producto: string;

    @Prop()
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

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;

}

export const StockSchema = SchemaFactory.createForClass(Stock);
