import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
})
export class User {
  @Prop({
    required: true,
    unique: true,
  })
  email: string;

  @Prop({
    required: true,
  })
  password: string;

  @Prop({
    required: true,
  })
  name: string;

  @Prop({
    required: false,
  })
  lastName: string;

  @Prop({
    required: false,
    unique: false,
  })
  nationalId: string;

  @Prop({
    required: false,
    unique: false,
  })
  phoneNumber: string;

  @Prop({
    required: false,
  })
  birthDate: string;

  @Prop({
    required: true,
  })
  role: number;

  @Prop({
    required: false,
    default: null,
  })
  resetPasswordToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
