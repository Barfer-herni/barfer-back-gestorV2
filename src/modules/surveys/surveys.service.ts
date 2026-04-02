import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Survey } from '../../schemas/surveys.schema';
import { SurveyResponse } from '../../schemas/survey_responses';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name) private surveyModel: Model<Survey>,
    @InjectModel(SurveyResponse.name)
    private responseModel: Model<SurveyResponse>,
  ) { }


  async createSurvey(data: any): Promise<Survey> {
    const survey = new this.surveyModel(data);
    return survey.save();
  }

  async findAllSurveys(): Promise<Survey[]> {
    return this.surveyModel.find().exec();
  }

  async findActiveSurvey(trigger: string): Promise<Survey> {
    return this.surveyModel.findOne({ trigger, status: 'active' }).exec();
  }

  async findSurveyById(id: string): Promise<Survey> {
    const survey = await this.surveyModel.findById(id).exec();
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }
    return survey;
  }

  async updateSurvey(id: string, data: any): Promise<Survey> {
    const updated = await this.surveyModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Survey not found');
    return updated;
  }

  // Responses
  async saveResponse(data: any): Promise<SurveyResponse> {
    const response = new this.responseModel(data);
    return response.save();
  }

  async findResponsesBySurvey(surveyId: string): Promise<SurveyResponse[]> {
    return this.responseModel
      .find({ surveyId: new Types.ObjectId(surveyId) })
      .populate('userId', 'email')
      .exec();
  }

  /**
   * Example of the advanced filtering requested:
   * "How many clients have dogs older than 8 years"
   * This uses the metadata tags defined in the schema.
   */
  async findClientsByAnswerMetadata(tag: string, valueQuery: any) {
    return this.responseModel
      .find({
        'answers.metadata.tag': tag,
        'answers.value': valueQuery,
      })
      .populate('userId', 'email')
      .select('userId completedAt')
      .exec();
  }
}
