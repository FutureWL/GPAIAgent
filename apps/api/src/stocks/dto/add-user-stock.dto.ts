import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AddUserStockDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  stockCode!: string;
}
