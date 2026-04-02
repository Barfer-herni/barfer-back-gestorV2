import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
class Answer {
  @Prop({ required: true })
  questionId: string;

  @Prop({ required: true })
  questionText: string;

  @Prop({ type: Object, required: true })
  value: any;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

const AnswerSchema = SchemaFactory.createForClass(Answer);

@Schema({
  timestamps: true,
})
export class SurveyResponse {
  @Prop({ type: Types.ObjectId, ref: 'Survey', required: true })
  surveyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  orderId: Types.ObjectId;

  @Prop({ type: [AnswerSchema], default: [] })
  answers: Answer[];

  @Prop({ required: true, default: Date.now })
  completedAt: Date;
}

export const SurveyResponseSchema = SchemaFactory.createForClass(SurveyResponse);

// Index for filtering specific answers (e.g., dog age > 8)
SurveyResponseSchema.index({ 'answers.metadata.tag': 1, 'answers.value': 1 });
SurveyResponseSchema.index({ userId: 1 });
SurveyResponseSchema.index({ surveyId: 1, createdAt: -1 });
