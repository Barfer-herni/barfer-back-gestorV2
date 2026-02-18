import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private client: any;
  constructor(private readonly configService: ConfigService) {
    this.client = new MercadoPagoConfig({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN'),
      options: {
        timeout: 5000,
      },
    });
  }

  async createPreference(order: any) {
    try {
      const response = await this.client.preferences.create(order);
      return response.body;
    } catch (error) {
      throw new InternalServerErrorException('Error creating preference');
    }
  }
}
