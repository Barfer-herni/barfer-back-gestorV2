import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
})
export class Event {
  @Prop({
    required: true,
  })
  title: string;

  @Prop({
    required: true,
  })
  isActive: boolean;
}

export const EventSchema = SchemaFactory.createForClass(Event);
