import { Module } from '@nestjs/common';
import { SalesPointsService } from './sales-points.service';
import { SalesPointsController } from './sales-points.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesPoint, SalesPointSchema } from '../../schemas/sales-point.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesPoint.name, schema: SalesPointSchema },
    ]),
  ],
  controllers: [SalesPointsController],
  providers: [SalesPointsService],
})
export class SalesPointsModule {}
