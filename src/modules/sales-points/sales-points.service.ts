import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalesPoint } from '../../schemas/sales-point.schema';
import { CreateSalesPointDto } from './dto/create-sales-point.dto';
import { UpdateSalesPointDto } from './dto/update-sales-point.dto';

@Injectable()
export class SalesPointsService {
  constructor(@InjectModel(SalesPoint.name) private salesPointModel: Model<SalesPoint>) {}

  async findAll(): Promise<SalesPoint[]> {
    return this.salesPointModel.find().exec();
  }

  async findOne(id: string): Promise<SalesPoint> {
    const salesPoint = await this.salesPointModel.findById(id).exec();
    if (!salesPoint) {
      throw new NotFoundException(`Sales point with ID ${id} not found`);
    }
    return salesPoint;
  }

  async create(createSalesPointDto: CreateSalesPointDto): Promise<SalesPoint> {
    const newSalesPoint = new this.salesPointModel(createSalesPointDto);
    return newSalesPoint.save();
  }

  async update(id: string, updateSalesPointDto: UpdateSalesPointDto): Promise<SalesPoint> {
    const updatedSalesPoint = await this.salesPointModel.findByIdAndUpdate(id, updateSalesPointDto, { new: true }).exec();
    if (!updatedSalesPoint) {
      throw new NotFoundException(`Sales point with ID ${id} not found`);
    }
    return updatedSalesPoint;
  }

  async remove(id: string): Promise<SalesPoint> {
    const deletedSalesPoint = await this.salesPointModel.findByIdAndDelete(id).exec();
    if (!deletedSalesPoint) {
      throw new NotFoundException(`Sales point with ID ${id} not found`);
    }
    return deletedSalesPoint;
  }
}
