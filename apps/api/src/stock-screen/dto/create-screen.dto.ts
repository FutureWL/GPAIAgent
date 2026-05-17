import { IsString, IsNotEmpty, IsOptional, MaxLength, IsObject, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScreenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsObject()
  @IsNotEmpty()
  criteria!: ScreenCriteria;
}

export class ScreenCriteria {
  @IsString()
  @IsOptional()
  market?: 'sh' | 'sz' | 'bj' | 'all';

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  priceChangeMin?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  priceChangeMax?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  turnoverRateMin?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  turnoverRateMax?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  volumeMin?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  volumeMax?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  marketCapMin?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  marketCapMax?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  netInflowMin?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  netInflowMax?: number;

  @IsString()
  @IsOptional()
  sector?: string;
}
