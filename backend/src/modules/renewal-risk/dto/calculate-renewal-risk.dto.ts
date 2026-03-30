import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateRenewalRiskDto {
  @ApiProperty({ example: 'prop-001' })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ example: '2025-01-02' })
  @IsDateString()
  asOfDate!: string;
}
