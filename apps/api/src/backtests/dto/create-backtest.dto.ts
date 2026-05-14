import { IsString, IsOptional } from 'class-validator';

export class CreateBacktestDto {
  @IsString()
  name!: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @IsOptional()
  params?: any;

  @IsString()
  @IsOptional()
  summary?: string;
}
