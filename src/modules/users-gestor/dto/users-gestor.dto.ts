import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateUserGestorDto {
  @IsString()
  email: string;

  @IsString()
  name: string;

  @IsString()
  lastName: string;

  @IsString()
  role: string;

  @IsString()
  password: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsOptional()
  puntoEnvio?: string | string[];
}
