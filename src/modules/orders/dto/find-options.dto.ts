import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class FindOptionsDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
