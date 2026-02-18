import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class CategoriaGestor extends Document {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    isActive: boolean;
}

export const CategoriaGestorSchema = SchemaFactory.createForClass(CategoriaGestor);
