import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AnalyzeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  stockCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  stockName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  prompt: string;
}
