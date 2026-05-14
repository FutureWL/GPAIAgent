import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateStrategyDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  content!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  tags!: string[];
}
