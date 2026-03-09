import {
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address } from '../../schemas/address.schema';
import { AddressDto } from './dto/address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private readonly addressModel: Model<Address>,
  ) {}

  async create(createAddressDto: AddressDto) {
    return await new this.addressModel(createAddressDto).save();
  }

  async findAll() {
    return await this.addressModel.find({}).exec();
  }

  async findOneById(id: string) {
    const addressData = await this.addressModel.findById(id).exec();
    if (!addressData) {
      return new NotFoundException('Address not found');
    }

    return addressData;
  }

  async findOneByAddress(address: string) {
    const addressData = await this.addressModel.findOne({ address }).exec();
    if (!addressData) {
      return new NotFoundException('Address not found');
    }
    return addressData;
  }

  async findManyByUserId(userId: string) {
    const addressData = await this.addressModel.find({ userId }).exec();
    if (!addressData) {
      return new NotFoundException('Address not found');
    }
    return addressData;
  }

  async update(id: string, updateAddressDto: AddressDto) {
    await this.findOneById(id);
    return await this.addressModel
      .findByIdAndUpdate(id, updateAddressDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    await this.findOneById(id);
    return this.addressModel.findByIdAndDelete(id).exec();
  }
}
