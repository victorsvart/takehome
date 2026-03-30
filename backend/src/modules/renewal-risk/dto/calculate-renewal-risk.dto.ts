import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CalculateRenewalRiskDto {
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @IsDateString()
  asOfDate!: string;
}
