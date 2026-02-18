import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PriceType {
    EFECTIVO = 'EFECTIVO',
    MAYORISTA = 'MAYORISTA',
    MINORISTA = 'MINORISTA',
}

export enum Section {
    PERRO = 'PERRO',
    GATO = 'GATO',
    OTROS = 'OTROS',
    RAW = 'RAW',
}

@Schema()
export class Prices extends Document {
    @Prop({
        type: String,
        enum: Section,
        required: true
    })
    section: Section;

    @Prop({ required: true })
    product: string;

    @Prop({ required: false })
    weight?: string;

    @Prop({
        type: String,
        enum: PriceType,
        required: true
    })
    priceType: PriceType;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    isActive: boolean;

    // @Prop({ required: true })
    // effectiveDate: string; // no se si lo voy a dejar

    @Prop({ required: true })
    month: number;

    @Prop({ required: true })
    year: number;

    @Prop({ required: true })
    createdAt: string;

    @Prop({ required: true })
    updateAt: string;

}

export const PricesSchema = SchemaFactory.createForClass(Prices);
