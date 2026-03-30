import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [DatabaseModule],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
