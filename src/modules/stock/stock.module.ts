import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { Stock, StockSchema } from '../../schemas/stock.schema';
import { PuntoEnvio, PuntoEnvioSchema } from '../../schemas/punto-envio.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Stock.name, schema: StockSchema },
            { name: PuntoEnvio.name, schema: PuntoEnvioSchema },
        ]),
    ],
    controllers: [StockController],
    providers: [StockService],
    exports: [StockService],
})
export class StockModule { }
