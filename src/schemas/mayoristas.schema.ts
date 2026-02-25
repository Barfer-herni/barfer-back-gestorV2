import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Mayoristas extends Document {
    @Prop({
        required: true,
        type: {
            name: { type: String, required: true },
            lastName: { type: String, required: true },
            email: { type: String, required: true },
        }
    })
    user: {
        name: string;
        lastName: string;
        email: string;
    };

    @Prop({
        required: true,
        type: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            phone: { type: String, required: true },
            betweenStreets: { type: String },
            floorNumber: { type: String },
            departmentNumber: { type: String },
        }
    })
    address: {
        address: string;
        city: string;
        phone: string;
        betweenStreets?: string;
        floorNumber?: string;
        departmentNumber?: string;
    };

    @Prop({ required: true, type: String })
    createdAt: string;

    @Prop({ required: true, type: String })
    updatedAt: string;
}

export const MayoristaSchema = SchemaFactory.createForClass(Mayoristas);