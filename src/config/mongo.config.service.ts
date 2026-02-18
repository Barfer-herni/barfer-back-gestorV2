import { Inject, Injectable } from '@nestjs/common';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { ConfigType } from '@nestjs/config';
import env from './env';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  private URL: string;

  constructor(
    @Inject(env.KEY) private readonly configService: ConfigType<typeof env>,
  ) {}

  async createMongooseOptions(): Promise<MongooseModuleOptions> {
    try {
      this.URL = this.configService.database_url;

      const conn: MongooseModuleOptions = {
        uri: this.URL,
        readPreference: 'primary',
        retryWrites: false,
        ssl: true,
      };

      return conn;
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }
}
