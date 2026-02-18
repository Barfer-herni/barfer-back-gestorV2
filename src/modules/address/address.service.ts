import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address } from '../../schemas/address.schema';
import { AddressDto } from './dto/address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private readonly addressModel: Model<Address>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async create(createAddressDto: AddressDto) {
    return await new this.addressModel(createAddressDto).save();
  }

  async findAll() {
    const address = await this.cacheManager.get(`address`);
    if (address) {
      return address;
    }

    const addressData = await this.addressModel.find({}).exec();
    await this.cacheManager.set(
      `address`,
      addressData,
      Number(this.configService.get<string>('CACHE_TTL')),
    );

    return addressData;
  }

  async findOneById(id: string) {
    const addressData = await this.addressModel.findById(id).exec();
    if (!addressData) {
      return new NotFoundException('Address not found');
    }

    return addressData;
  }

  async findOneByAddress(address: string) {
    const dataFromLocalCache = await this.cacheManager.get(
      `${address}:address`,
    );
    if (dataFromLocalCache) {
      return dataFromLocalCache;
    }

    const addressData = await this.addressModel.findOne({ address }).exec();
    if (!addressData) {
      return new NotFoundException('Address not found');
    }
    await this.cacheManager.set(
      `${address}:address`,
      addressData,
      Number(this.configService.get<string>('CACHE_TTL')),
    );
    return addressData;
  }

  async findManyByUserId(userId: string) {
    const dataFromLocalCache = await this.cacheManager.get(`${userId}:address`);
    if (dataFromLocalCache) {
      return dataFromLocalCache;
    }

    const addressData = await this.addressModel.find({ userId }).exec();
    if (!addressData) {
      return new NotFoundException('Address not found');
    }

    await this.cacheManager.set(
      `${userId}:address`,
      addressData,
      Number(this.configService.get<string>('CACHE_TTL')),
    );
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
