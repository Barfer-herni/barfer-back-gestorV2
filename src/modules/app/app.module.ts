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
import { PuntoVentaModule } from '../puntos-venta/punto-venta.module';
import { MayoristasModule } from '../mayoristas/mayoristas.module';
import { CategoriasGestorModule } from '../categorias-gestor/categorias-gestor.module';
import { MetodosPagoModule } from '../metodos-pago/metodos-pago.module';
import { TemplatePricesProductsModule } from '../template_prices_products/template_prices_products.module';
import { AnalyticsModule } from '../analytics/analytics.module';

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
    PuntoVentaModule,
    MayoristasModule,
    CategoriasGestorModule,
    MetodosPagoModule,
    TemplatePricesProductsModule,
    AnalyticsModule,
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
