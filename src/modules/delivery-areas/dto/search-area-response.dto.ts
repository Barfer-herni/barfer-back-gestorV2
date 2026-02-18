import { DeliveryArea } from '../../../schemas/delivery-area.schema';

export class ZoneMatchDto {
  message: string;
  zone: DeliveryArea;
  orderCutOffHour: number;
  sameDayDelivery: boolean;
  whatsappNumber?: string;
}

export class SearchAreaResponseDto {
  validAddress: boolean;
  zones: ZoneMatchDto[];
} 