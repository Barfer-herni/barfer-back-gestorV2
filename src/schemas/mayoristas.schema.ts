import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Mayoristas extends Document {
    @Prop({ required: true })
    user: {
        name: string;
        lastName: string;
        email: string;
    };
    @Prop({ required: true })
    address: {
        address: string;
        city: string;
        phone: string;
        betweenStreets?: string;
        floorNumber?: string;
        departmentNumber?: string;
    };
    @Prop({ required: true })
    createdAt: string;
    @Prop({ required: true })
    updatedAt: string;
}

export const MayoristaSchema = SchemaFactory.createForClass(Mayoristas);
