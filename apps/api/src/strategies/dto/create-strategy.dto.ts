import { IsArray, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateStrategyDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  content!: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsOptional()
  @IsString()
  stockCode?: string;

  @IsOptional()
  @IsString()
  @IsIn(['risk_high', 'profit_high', 'neutral', 'avoid'])
  riskLevel?: string;
}
