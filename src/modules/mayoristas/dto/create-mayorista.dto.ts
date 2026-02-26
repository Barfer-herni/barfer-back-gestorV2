import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsEmail()
    @IsOptional()
    email?: string;
}

class AddressDto {
    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsOptional()
    betweenStreets?: string;

    @IsString()
    @IsOptional()
    floorNumber?: string;

    @IsString()
    @IsOptional()
    departmentNumber?: string;
}

export class CreateMayoristaDto {
    @ValidateNested()
    @Type(() => UserDto)
    @IsNotEmpty()
    user: UserDto;

    @ValidateNested()
    @Type(() => AddressDto)
    @IsNotEmpty()
    address: AddressDto;
}
