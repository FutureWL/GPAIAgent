import { IsEnum } from 'class-validator';

export enum MembershipLevelDto {
  NORMAL = 'NORMAL',
  PRIVATE = 'PRIVATE',
}

export enum MembershipTypeDto {
  TRIAL = 'TRIAL',
  MONTHLY = 'MONTHLY',
}

export class ActivateMembershipDto {
  @IsEnum(MembershipLevelDto)
  level: MembershipLevelDto;

  @IsEnum(MembershipTypeDto)
  type: MembershipTypeDto;
}
