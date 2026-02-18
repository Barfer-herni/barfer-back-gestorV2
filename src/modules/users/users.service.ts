import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../schemas/user.schema';
import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async create(user: UserDto) {
    return await new this.userModel(user).save();
  }

  async findOneByEmail(email: string): Promise<UserDto> {
    const user = await this.userModel.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOneByEmailWithOutException(email: string): Promise<UserDto> {
    const user = await this.userModel.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    }).exec();
    return user;
  }

  async update(id: string, user: UpdateUserDto) {
    return await this.userModel
      .findByIdAndUpdate(id, user, { new: true })
      .exec();
  }

  async findAll() {
    const dataFromLocalCache = await this.cacheManager.get(`users`);
    if (dataFromLocalCache) {
      return dataFromLocalCache;
    }

    const users = await this.userModel.find().exec();
    await this.cacheManager.set(`users`, users, 120000);

    return users;
  }

  async findById(id: string) {
    const dataFromLocalCache = await this.cacheManager.get(`users-${id}`);
    if (dataFromLocalCache) {
      return dataFromLocalCache;
    }

    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheManager.set(
      `users-${id}`,
      user,
      Number(this.configService.get('CACHE_TTL')),
    );
    return user;
  }
}
