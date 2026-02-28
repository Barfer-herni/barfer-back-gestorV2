import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PuntosVenta, PuntosVentaSchema } from '../../schemas/puntos-venta.schema';
import { PuntosVentaController } from './punto-venta.controller';
import { PuntosVentaService } from './punto-venta.service';

@Module({
  controllers: [PuntosVentaController],
  providers: [PuntosVentaService],
  imports: [
    MongooseModule.forFeature([
      {
        name: PuntosVenta.name,
        schema: PuntosVentaSchema,
      },
    ]),
  ],
  exports: [PuntosVentaService],
})
export class PuntoVentaModule { }
