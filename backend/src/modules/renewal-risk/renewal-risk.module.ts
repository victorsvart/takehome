import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { RenewalRiskController } from './renewal-risk.controller';
import { RenewalRiskService } from './renewal-risk.service';

@Module({
  imports: [DatabaseModule, WebhooksModule],
  controllers: [RenewalRiskController],
  providers: [RenewalRiskService],
})
export class RenewalRiskModule {}
