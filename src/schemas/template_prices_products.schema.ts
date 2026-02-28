import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PriceSection {
    PERRO = 'PERRO',
    GATO = 'GATO',
    OTROS = 'OTROS',
    RAW = 'RAW',
}

export enum PriceType {
    EFECTIVO = 'EFECTIVO',
    TRANSFERENCIA = 'TRANSFERENCIA',
    MAYORISTA = 'MAYORISTA',
}


@Schema({ timestamps: true, collection: 'template_prices_products' })
export class TemplatePricesProducts extends Document {
    @Prop({
        type: String,
        enum: PriceSection,
        required: true
    })
    section: PriceSection;

    @Prop({ required: true })
    product: string;

    @Prop({ required: false })
    weight?: string;

    @Prop({ required: true })
    priceTypes: PriceType[];

}

export const TemplatePricesProductsSchema = SchemaFactory.createForClass(TemplatePricesProducts);
