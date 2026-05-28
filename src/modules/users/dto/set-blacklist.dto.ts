import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class BlacklistOrderAddressDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  floorNumber?: string;

  @IsOptional()
  @IsString()
  departmentNumber?: string;

  @IsOptional()
  @IsString()
  betweenStreets?: string;
}

export class SetBlackListDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsBoolean()
  blackListed: boolean;

  /** Dirección de la orden desde la que se marca (para vincular la ubicación) */
  @IsOptional()
  @ValidateNested()
  @Type(() => BlacklistOrderAddressDto)
  orderAddress?: BlacklistOrderAddressDto;
}
