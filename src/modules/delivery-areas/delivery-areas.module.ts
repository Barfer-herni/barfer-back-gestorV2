import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryAreasService } from './delivery-areas.service';
import {
  DeliveryArea,
  DeliveryAreaSchema,
} from '../../schemas/delivery-area.schema';
import { DeliveryAreasController } from './delivery-areas.controller';
import { GoogleSheetModule } from '../google-sheet/google-sheet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryArea.name, schema: DeliveryAreaSchema },
    ]),
    GoogleSheetModule,
  ],
  controllers: [DeliveryAreasController],
  providers: [DeliveryAreasService],
  exports: [DeliveryAreasService],
})
export class DeliveryAreasModule {}
