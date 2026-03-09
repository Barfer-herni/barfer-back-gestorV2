import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { Stock, StockSchema } from '../../schemas/stock.schema';
import { PuntoEnvio, PuntoEnvioSchema } from '../../schemas/punto-envio.schema';
import { Prices, PricesSchema } from '../../schemas/prices.schema';
import { OrdersModule } from '../orders/orders.module';


@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Stock.name, schema: StockSchema },
            { name: PuntoEnvio.name, schema: PuntoEnvioSchema },
            { name: Prices.name, schema: PricesSchema },
        ]),
        OrdersModule,
    ],
    controllers: [StockController],
    providers: [StockService],
    exports: [StockService],
})
export class StockModule { }
