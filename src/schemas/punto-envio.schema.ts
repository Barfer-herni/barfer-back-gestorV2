
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


@Schema()
export class PuntoEnvio extends Document {

    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    cutoffTime: string;

    @Prop({ required: true })
    createdAt: string;

    @Prop({ required: true })
    updateAt: string;

}

export const PuntoEnvioSchema = SchemaFactory.createForClass(PuntoEnvio);

