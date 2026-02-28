import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetodosPagoService } from './metodos-pago.service';
import { MetodosPagoController } from './metodos-pago.controller';
import { MetodoPago, MetodoPagoSchema } from '../../schemas/metodos-pago.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: MetodoPago.name, schema: MetodoPagoSchema },
        ]),
    ],
    controllers: [MetodosPagoController],
    providers: [MetodosPagoService],
    exports: [MetodosPagoService],
})
export class MetodosPagoModule { }
