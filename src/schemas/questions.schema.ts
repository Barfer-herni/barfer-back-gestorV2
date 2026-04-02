import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Question {
  @Prop({ required: true })
  questionId: string;

  @Prop({ required: true })
  text: string;

  @Prop({
    required: true,
    enum: ['text', 'number', 'single-choice', 'multiple-choice', 'rating'],
  })
  type: string;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ required: true, default: false })
  required: boolean;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
