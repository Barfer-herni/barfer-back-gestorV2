import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
})
export class Address {
  @Prop({
    required: true,
  })
  userId: string;

  @Prop({
    required: true,
  })
  address: string;

  @Prop({
    required: false,
  })
  reference: string;

  @Prop({
    required: true,
  })
  firstName: string;

  @Prop({
    required: true,
  })
  lastName: string;

  @Prop({
    required: false,
  })
  zipCode: string;

  @Prop({
    required: true,
  })
  city: string;

  @Prop({
    required: true,
  })
  phone: string;

  @Prop({
    required: true,
  })
  email: string;

  @Prop({
    required: false,
  })
  floorNumber: string;

  @Prop({
    required: false,
  })
  departmentNumber: string;

  // New field: betweenStreets
  @Prop({
    required: false,
  })
  betweenStreets?: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
