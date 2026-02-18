import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false, timestamps: true })
export class RepartoEntry {
    @Prop({ required: true })
    id: string;

    @Prop({ required: true })
    text: string;

    @Prop({ default: false })
    isCompleted: boolean;
}

export const RepartoEntrySchema = SchemaFactory.createForClass(RepartoEntry);

@Schema({ timestamps: true })
export class Reparto extends Document {
    @Prop({ required: true, unique: true })
    weekKey: string; // Formato: "YYYY-MM-DD" (el lunes de esa semana)

    @Prop({
        type: Map,
        of: [RepartoEntrySchema],
        required: true,
    })
    data: Map<string, RepartoEntry[]>;
    // Las llaves del mapa son "1" (Lunes) hasta "6" (Sábado)
}

export const RepartoSchema = SchemaFactory.createForClass(Reparto);