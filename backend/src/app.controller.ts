import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  getHealth(): { status: string } {
    return this.appService.getHealth();
  }

  @Get('properties')
  async listProperties(): Promise<Array<{ id: string; name: string }>> {
    const rows = await this.prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    });
    return rows;
  }
}
