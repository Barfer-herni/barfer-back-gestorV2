import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Survey } from '../../schemas/surveys.schema';
import { SurveyResponse } from '../../schemas/survey_responses';
import { Order } from '../../schemas/order.schema';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name) private surveyModel: Model<Survey>,
    @InjectModel(SurveyResponse.name)
    private responseModel: Model<SurveyResponse>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
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

  async findResponsesBySurvey(surveyId: string): Promise<any[]> {
    const responses = await this.responseModel
      .find({ surveyId: new Types.ObjectId(surveyId) })
      .populate('userId', 'email')
      .lean()
      .exec();

    const emails = responses.map((r: any) => r.userId?.email).filter(Boolean);

    const orders = await this.orderModel.find({
      'user.email': { $in: emails }
    }).select('user.email deliveryArea.sameDayDelivery').lean().exec();

    orders.sort((a: any, b: any) => String(b._id).localeCompare(String(a._id)));

    const expressMap = new Map<string, boolean>();
    for (const order of orders) {
      if (order.user?.email && !expressMap.has(order.user.email)) {
        expressMap.set(order.user.email, !!order.deliveryArea?.sameDayDelivery);
      }
    }

    return responses.map((r: any) => {
      let shippingType = 'Desconocido';
      if (r.userId?.email) {
        if (expressMap.has(r.userId.email)) {
          shippingType = expressMap.get(r.userId.email) ? 'Express' : 'Programado';
        } else {
          shippingType = 'Sin pedidos';
        }
      }
      return {
        ...r,
        shippingType,
      };
    });
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
