import { CacheModule } from '@nestjs/cache-manager';
import { Inject, Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { configValidationSchema } from '../../config/config-schema-vars';
import { MongooseConfigService } from '../../config/mongo.config.service';
import { AddressModule } from '../../modules/address/address.module';
import { AuthModule } from '../../modules/auth/auth.module';
import { CategoriesModule } from '../../modules/categories/categories.module';
import { DeliveryAreasModule } from '../../modules/delivery-areas/delivery-areas.module';
import { OptionsModule } from '../../modules/options/options.module';
import { OrdersModule } from '../../modules/orders/orders.module';
import { ProductsModule } from '../../modules/products/products.module';
import { UsersModule } from '../../modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import ENV from '../../config/env';
import { SalesPointsModule } from '../sales-points/sales-points.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { UsersGestorModule } from '../users-gestor/users-gestor.module';
import { PricesModule } from '../prices/prices.module';
import { SalidasModule } from '../salidas/salidas.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';
import { StockModule } from '../stock/stock.module';
import { RepartosModule } from '../repartos/repartos.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({ useClass: MongooseConfigService }),
    ConfigModule.forRoot({
      validationSchema: configValidationSchema,
      validate: (config) => configValidationSchema.parse(config),
      isGlobal: true,
      load: [ENV],
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
          },
        };
      },
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    CacheModule.register({ isGlobal: true }),
    ProductsModule,
    AddressModule,
    DeliveryAreasModule,
    OrdersModule,
    OptionsModule,
    SalesPointsModule,
    DiscountsModule,
    UsersGestorModule,
    PricesModule,
    SalidasModule,
    ProveedoresModule,
    StockModule,
    RepartosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  static port: string;

  constructor(
    @Inject(ENV.KEY) private readonly configService: ConfigType<typeof ENV>,
  ) {
    AppModule.port = this.configService.PORT;
  }
}
