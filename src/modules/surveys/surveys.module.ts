import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { Survey, SurveySchema } from '../../schemas/surveys.schema';
import {
  SurveyResponse,
  SurveyResponseSchema,
} from '../../schemas/survey_responses';
import { Order, OrderSchema } from '../../schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Survey.name, schema: SurveySchema },
      { name: SurveyResponse.name, schema: SurveyResponseSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
