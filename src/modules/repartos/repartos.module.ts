import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RepartosService } from './repartos.service';
import { RepartosController } from './repartos.controller';
import { Reparto, RepartoSchema } from '../../schemas/repartos.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Reparto.name, schema: RepartoSchema }]),
    ],
    controllers: [RepartosController],
    providers: [RepartosService],
    exports: [RepartosService],
})
export class RepartosModule { }
