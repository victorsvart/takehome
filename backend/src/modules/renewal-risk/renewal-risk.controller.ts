import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CalculateRenewalRiskDto } from './dto/calculate-renewal-risk.dto';
import { RenewalRiskService } from './renewal-risk.service';

@Controller('properties/:propertyId/renewal-risk')
export class RenewalRiskController {
  constructor(private readonly renewalRiskService: RenewalRiskService) {}

  @Post('calculate')
  async calculateRenewalRisk(
    @Param('propertyId') propertyId: string,
    @Body() body: CalculateRenewalRiskDto,
  ) {
    return this.renewalRiskService.calculateRiskForProperty(propertyId, body);
  }

  @Get()
  async getLatestRenewalRisk(@Param('propertyId') propertyId: string) {
    return this.renewalRiskService.getLatestRiskForProperty(propertyId);
  }

  @Post(':residentId/trigger-event')
  async triggerRenewalEvent(
    @Param('propertyId') propertyId: string,
    @Param('residentId') residentId: string,
  ) {
    return this.renewalRiskService.triggerRenewalEvent(propertyId, residentId);
  }
}
