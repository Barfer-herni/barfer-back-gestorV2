

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
    ADMIN = 'admin',
    GESTOR = 'user'
}


@Schema()
export class UserGestor extends Document {
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    lastName: string;

    @Prop({
        type: String,
        enum: UserRole,
        required: true
    })
    role: UserRole;

    @Prop({ required: true })
    password: string;

    @Prop({ required: false })
    permissions?: string[];

    @Prop({ required: false })
    puntoEnvio?: string | string[];

}

export const UserGestorSchema = SchemaFactory.createForClass(UserGestor);
