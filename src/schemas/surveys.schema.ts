import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Question, QuestionSchema } from './questions.schema';

@Schema({
  timestamps: true,
})
export class Survey {
  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  description: string;

  @Prop({
    required: true,
    enum: ['active', 'inactive', 'draft'],
    default: 'draft',
  })
  status: string;

  @Prop({
    required: true,
    enum: ['post-purchase', 'homepage', 'manual'],
    default: 'manual',
  })
  trigger: string;

  @Prop({ type: [QuestionSchema], default: [] })
  questions: Question[];
}

export const SurveySchema = SchemaFactory.createForClass(Survey);

SurveySchema.index({ status: 1, trigger: 1 });
