import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AiScreenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;
}
