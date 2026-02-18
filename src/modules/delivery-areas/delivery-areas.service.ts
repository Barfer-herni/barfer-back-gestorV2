import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as turf from '@turf/turf';
import axios from 'axios';
import { Model } from 'mongoose';
import { DeliveryArea, WeekDay } from '../../schemas/delivery-area.schema';
import { DeliveryAreaDto } from './dto/delivery-area.dto';
import { ConfigService } from '@nestjs/config';
import {
  SearchAreaResponseDto,
  ZoneMatchDto,
} from './dto/search-area-response.dto';
import { DeliverySheetService } from '../google-sheet/delivery-sheet.service';

@Injectable()
export class DeliveryAreasService {
  constructor(
    @InjectModel(DeliveryArea.name)
    private deliveryAreaModel: Model<DeliveryArea>,
    private readonly configService: ConfigService,
    private readonly deliverySheetService: DeliverySheetService,
  ) {}

  async create(createDeliveryAreaDto: DeliveryAreaDto) {
    try {
      const newZone = new this.deliveryAreaModel(createDeliveryAreaDto);
      return await newZone.save();
    } catch (error) {
      console.error('ERROR when creating zone: ', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll() {
    try {
      return await this.deliveryAreaModel.find({
        $or: [
          { enabled: true },
          { enabled: { $exists: false } }
        ]
      }).exec();
    } catch (error) {
      console.error('ERROR when finding all zones: ', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAllAdmin() {
    try {
      return await this.deliveryAreaModel.find().exec();
    } catch (error) {
      console.error('ERROR when finding all zones: ', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOneById(id: string) {
    try {
      return await this.deliveryAreaModel.findById(id).exec();
    } catch (error) {
      console.error('ERROR when finding zone by ID: ', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(id: string, updateDeliveryAreaDto: DeliveryAreaDto) {
    try {
      // Obtener la zona actual para comparar el sheetName
      const currentZone = await this.deliveryAreaModel.findById(id).exec();

      const isDifferentSheetName =
        currentZone.sheetName !== updateDeliveryAreaDto.sheetName;

      // Si es una zona con entrega en el día y el sheetName cambió
      if (
        currentZone.sameDayDelivery &&
        updateDeliveryAreaDto.sameDayDelivery &&
        isDifferentSheetName
      ) {
        await this.deliverySheetService.updateZoneSheetName(
          currentZone.sheetName,
          updateDeliveryAreaDto.sheetName,
        );
      }

      // Actualizar la zona
      const updatedZone = await this.deliveryAreaModel
        .findByIdAndUpdate(id, updateDeliveryAreaDto, { new: true })
        .exec();

      return updatedZone;
    } catch (error) {
      console.error('ERROR when updating zone: ', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: string) {
    try {
      return await this.deliveryAreaModel.findByIdAndDelete(id).exec();
    } catch (error) {
      console.error('ERROR when removing zone: ', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async searchAreaByCoordinates(
    lat: number,
    lon: number,
    currentDay: WeekDay,
  ): Promise<SearchAreaResponseDto> {
    try {
      const point = turf.point([lon, lat]);
      const zones = await this.deliveryAreaModel.find({
        $or: [
          { enabled: true },
          { enabled: { $exists: false } }
        ]
      });
      const matchedZones: ZoneMatchDto[] = [];

      const now = new Date().toLocaleString('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
      });
      const currentHour = new Date(now).getHours();

      for (const zone of zones) {
        const correctedPolygon = this.correctPolygon([zone.coordinates]);
        const multiPolygon = turf.multiPolygon([correctedPolygon]);
        const isValidPoint = turf.booleanPointInPolygon(point, multiPolygon);

        if (isValidPoint) {
          if (zone.sameDayDelivery) {
            const isBeforeCutoff = currentHour < zone.orderCutOffHour;
            const isDayAllowed = zone.sameDayDeliveryDays.includes(currentDay);

            if (isBeforeCutoff && isDayAllowed) {
              matchedZones.push({
                message: `Dias de entrega: ${zone.schedule}`,
                zone: zone,
                orderCutOffHour: zone.orderCutOffHour,
                sameDayDelivery: true,
                whatsappNumber: zone.whatsappNumber,
              });
            }
          } else {
            matchedZones.push({
              message: `Dias de entrega: ${zone.schedule}`,
              zone: zone,
              orderCutOffHour: zone.orderCutOffHour,
              sameDayDelivery: false,
              whatsappNumber: zone.whatsappNumber,
            });
          }
        }
      }

      if (matchedZones.length > 0) {
        return {
          validAddress: true,
          zones: matchedZones,
        };
      } else {
        throw new InternalServerErrorException(
          'No encontramos esa dirección en ninguna de nuestras zonas',
        );
      }
    } catch (error) {
      console.error('ERROR al buscar ÁREA por coordenadas: ', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async searchAreaByAddress(
    address: string,
    currentDay: WeekDay,
  ): Promise<SearchAreaResponseDto> {
    try {
      const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: address,
            key: apiKey,
          },
        },
      );

      if (response.data.results?.[0]?.geometry?.location) {
        const { lat, lng } = response.data.results[0].geometry.location;
        return this.searchAreaByCoordinates(lat, lng, currentDay);
      } else {
        throw new BadRequestException(
          'No se encontraron resultados para la dirección proporcionada.',
        );
      }
    } catch (error) {
      console.error('ERROR al buscar ÁREA por dirección: ', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  private correctPolygon(coordinates: number[][][]): number[][][] {
    const firstCoordinate = coordinates[0][0];
    const lastCoordinate = coordinates[0][coordinates[0].length - 1];

    if (
      firstCoordinate[0] !== lastCoordinate[0] ||
      firstCoordinate[1] !== lastCoordinate[1]
    ) {
      coordinates[0].push(firstCoordinate);
    }

    return coordinates;
  }
}
