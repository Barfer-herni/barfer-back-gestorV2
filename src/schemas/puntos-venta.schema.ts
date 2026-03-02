import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'puntos_venta', timestamps: true })
export class PuntosVenta extends Document {
    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    zona: string;

    @Prop({ required: true })
    frecuencia: string;

    @Prop({ required: true })
    fechaInicioVentas: Date;

    @Prop({ required: false })
    fechaPrimerPedido?: Date;

    @Prop({ required: false })
    fechaUltimoPedido?: Date;

    @Prop({ required: true, default: false })
    tieneFreezer: boolean;

    @Prop({ required: false })
    cantidadFreezers?: number;

    @Prop({ required: false })
    capacidadFreezer?: number;

    @Prop({ type: [String], required: true })
    tiposNegocio: string[];

    @Prop({ required: false })
    horarios?: string;

    @Prop({
        type: [
            {
                mes: Number,
                anio: Number,
                kilos: Number,
            },
        ],
        default: [],
    })
    kilosPorMes: Array<{
        mes: number;
        anio: number;
        kilos: number;
    }>;

    @Prop({
        type: {
            telefono: String,
            email: String,
            direccion: String,
        },
        required: false,
    })
    contacto?: {
        telefono?: string;
        email?: string;
        direccion?: string;
    };

    @Prop({ required: false })
    notas?: string;

    @Prop({ required: true, default: true })
    activo: boolean;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const PuntosVentaSchema = SchemaFactory.createForClass(PuntosVenta);
