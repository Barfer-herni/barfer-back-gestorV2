import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
    timestamps: true,
    collection: 'order_priority',
})
export class OrderPriority {
    @Prop({
        required: true,
    })
    fecha: string;

    @Prop({
        required: true,
    })
    puntoEnvio: string;

    @Prop({
        required: true,
    })
    orderIds: string[];

    @Prop({
        required: true,
    })
    createdAt: Date;

    @Prop({
        required: true,
    })
    updatedAt: Date;
}

export const OrderPrioritySchema = SchemaFactory.createForClass(OrderPriority);
