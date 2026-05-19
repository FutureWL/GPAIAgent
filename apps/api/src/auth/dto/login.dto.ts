import { IsString, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @ValidateIf((o) => o.captchaKey !== undefined && o.captchaKey !== null && o.captchaKey !== '')
  @IsString()
  captchaKey?: string;

  @ValidateIf((o) => o.captchaCode !== undefined && o.captchaCode !== null && o.captchaCode !== '')
  @IsString()
  @MinLength(4)
  captchaCode?: string;
}
