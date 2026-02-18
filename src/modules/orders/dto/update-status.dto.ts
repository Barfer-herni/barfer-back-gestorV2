import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateStatusDto {
  @IsNumber()
  @IsNotEmpty()
  status: number;
}
