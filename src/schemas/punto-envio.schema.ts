
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


@Schema({
    timestamps: true,
    collection: 'punto_envio'
})
export class PuntoEnvio {
    _id: string;

    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    cutoffTime: string;

    @Prop({ required: true })
    createdAt: string;

    @Prop({ required: true })
    updatedAt: string;

}

export const PuntoEnvioSchema = SchemaFactory.createForClass(PuntoEnvio);

