import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class RepartoEntryDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsString()
    @IsNotEmpty()
    text: string;

    @IsBoolean()
    isCompleted: boolean;
}

export class CreateRepartoDto {
    @IsString()
    @IsNotEmpty()
    weekKey: string;

    @IsObject()
    @IsNotEmpty()
    data: Record<string, RepartoEntryDto[]>;
}

export class UpdateRepartoEntryDto {
    @IsString()
    @IsOptional()
    text?: string;

    @IsBoolean()
    @IsOptional()
    isCompleted?: boolean;
}
