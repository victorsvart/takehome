import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaseStatus, LeaseType, RiskTier } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CalculateRenewalRiskDto } from './dto/calculate-renewal-risk.dto';

@Injectable()
export class RenewalRiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooksService: WebhooksService,
  ) {}

  async calculateRiskForProperty(
    propertyId: string,
    input: CalculateRenewalRiskDto,
  ) {
    if (input.propertyId !== propertyId) {
      throw new BadRequestException(
        'propertyId in body must match route parameter',
      );
    }

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    const asOfDate = this.parseDate(input.asOfDate);
    const calculatedAt = new Date();
    const sixMonthsAgo = new Date(asOfDate);
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);

    const leases = await this.prisma.lease.findMany({
      where: {
        propertyId,
        status: LeaseStatus.active,
      },
      include: {
        resident: {
          include: {
            ledgerEntries: {
              where: {
                transactionType: 'payment',
                chargeCode: 'rent',
                transactionDate: {
                  gte: sixMonthsAgo,
                  lte: asOfDate,
                },
              },
            },
          },
        },
        unit: {
          include: {
            pricing: {
              where: { effectiveDate: { lte: asOfDate } },
              orderBy: { effectiveDate: 'desc' },
              take: 1,
            },
          },
        },
        renewalOffers: {
          where: { status: { in: ['pending', 'accepted'] } },
          take: 1,
        },
      },
    });

    const computedScores: Array<{
      leaseId: string;
      residentId: string;
      residentName: string;
      unitId: string;
      unitDbId: string;
      riskScore: number;
      riskTier: RiskTier;
      daysToExpiry: number;
      signals: {
        daysToExpiryDays: number;
        paymentHistoryDelinquent: boolean;
        noRenewalOfferYet: boolean;
        rentGrowthAboveMarket: boolean;
      };
    }> = leases.map((lease) => {
      const daysToExpiry =
        lease.leaseType === LeaseType.month_to_month
          ? 30
          : this.diffDays(asOfDate, lease.leaseEndDate);
      const daysSignal = this.daysToExpirySignal(daysToExpiry);
      const expectedPayments = 6;
      // DECISION: A resident is treated as delinquent when at least one expected
      // monthly rent payment is missing in the six-month lookback window. This
      // keeps the signal simple and matches "missed/late payments" intent.
      const paymentHistoryDelinquent =
        lease.resident.ledgerEntries.length <=
        Math.max(1, expectedPayments - 1);
      const delinquencySignal = paymentHistoryDelinquent ? 100 : 0;
      const noRenewalOfferYet = lease.renewalOffers.length === 0;
      const renewalOfferSignal = noRenewalOfferYet ? 100 : 0;
      const marketRent = lease.unit.pricing[0]?.marketRent;
      const rentGrowthAboveMarket =
        marketRent !== undefined &&
        Number(marketRent) >= Number(lease.monthlyRent) * 1.1;
      const marketSignal =
        marketRent === undefined ? 40 : rentGrowthAboveMarket ? 100 : 0;

      const riskScore = Math.round(
        daysSignal * 0.4 +
          delinquencySignal * 0.25 +
          renewalOfferSignal * 0.2 +
          marketSignal * 0.15,
      );

      return {
        leaseId: lease.id,
        residentId: lease.residentId,
        residentName: `${lease.resident.firstName} ${lease.resident.lastName}`,
        unitId: lease.unit.unitNumber,
        unitDbId: lease.unitId,
        riskScore,
        riskTier: this.toTier(riskScore),
        daysToExpiry,
        signals: {
          daysToExpiryDays: daysToExpiry,
          paymentHistoryDelinquent,
          noRenewalOfferYet,
          rentGrowthAboveMarket,
        },
      };
    });

    // DECISION: Persist score rows in bounded chunks so a large property batch
    // does not become one long serial transaction while each resident write
    // remains atomic through per-row transactions.
    const chunkSize = 25;
    for (let index = 0; index < computedScores.length; index += chunkSize) {
      const chunk = computedScores.slice(index, index + chunkSize);
      await Promise.all(
        chunk.map(async (row) => {
          await this.prisma.$transaction(async (tx) => {
            const riskScoreRow = await tx.renewalRiskScore.upsert({
              where: {
                propertyId_residentId_asOfDate: {
                  propertyId,
                  residentId: row.residentId,
                  asOfDate,
                },
              },
              create: {
                propertyId,
                residentId: row.residentId,
                leaseId: row.leaseId,
                asOfDate,
                daysToExpiry: row.daysToExpiry,
                riskScore: row.riskScore,
                riskTier: row.riskTier,
                calculatedAt,
              },
              update: {
                leaseId: row.leaseId,
                daysToExpiry: row.daysToExpiry,
                riskScore: row.riskScore,
                riskTier: row.riskTier,
                calculatedAt,
              },
            });

            await tx.renewalRiskSignal.upsert({
              where: { renewalRiskScoreId: riskScoreRow.id },
              create: {
                propertyId,
                residentId: row.residentId,
                leaseId: row.leaseId,
                unitId: row.unitDbId,
                renewalRiskScoreId: riskScoreRow.id,
                daysToExpiryDays: row.signals.daysToExpiryDays,
                paymentHistoryDelinquent: row.signals.paymentHistoryDelinquent,
                noRenewalOfferYet: row.signals.noRenewalOfferYet,
                rentGrowthAboveMarket: row.signals.rentGrowthAboveMarket,
              },
              update: {
                leaseId: row.leaseId,
                unitId: row.unitDbId,
                daysToExpiryDays: row.signals.daysToExpiryDays,
                paymentHistoryDelinquent: row.signals.paymentHistoryDelinquent,
                noRenewalOfferYet: row.signals.noRenewalOfferYet,
                rentGrowthAboveMarket: row.signals.rentGrowthAboveMarket,
              },
            });
          });
        }),
      );
    }

    const flagged = computedScores.filter(
      (row) => row.riskTier !== RiskTier.low,
    );
    const riskTiers = {
      high: flagged.filter((row) => row.riskTier === RiskTier.high).length,
      medium: flagged.filter((row) => row.riskTier === RiskTier.medium).length,
      low: flagged.filter((row) => row.riskTier === RiskTier.low).length,
    };

    return {
      propertyId,
      calculatedAt: calculatedAt.toISOString(),
      totalResidents: computedScores.length,
      flaggedCount: flagged.length,
      riskTiers,
      flags: flagged.map((row) => ({
        residentId: row.residentId,
        name: row.residentName,
        unitId: row.unitId,
        riskScore: row.riskScore,
        riskTier: row.riskTier,
        daysToExpiry: row.daysToExpiry,
        signals: row.signals,
      })),
    };
  }

  async getLatestRiskForProperty(propertyId: string) {
    const latest = await this.prisma.renewalRiskScore.findFirst({
      where: { propertyId },
      orderBy: { calculatedAt: 'desc' },
      select: { calculatedAt: true },
    });

    if (!latest) {
      return {
        propertyId,
        calculatedAt: null,
        totalResidents: 0,
        flaggedCount: 0,
        riskTiers: { high: 0, medium: 0, low: 0 },
        flags: [],
      };
    }

    const scores = await this.prisma.renewalRiskScore.findMany({
      where: {
        propertyId,
        calculatedAt: latest.calculatedAt,
      },
      orderBy: [{ riskScore: 'desc' }, { residentId: 'asc' }],
      include: {
        resident: {
          include: {
            unit: true,
          },
        },
        signal: true,
      },
    });

    const flagged = scores.filter(
      (row) => row.riskTier !== RiskTier.low && row.signal,
    );

    return {
      propertyId,
      calculatedAt: latest.calculatedAt.toISOString(),
      totalResidents: scores.length,
      flaggedCount: flagged.length,
      riskTiers: {
        high: flagged.filter((row) => row.riskTier === RiskTier.high).length,
        medium: flagged.filter((row) => row.riskTier === RiskTier.medium)
          .length,
        low: flagged.filter((row) => row.riskTier === RiskTier.low).length,
      },
      flags: flagged.map((row) => ({
        residentId: row.residentId,
        name: `${row.resident.firstName} ${row.resident.lastName}`,
        unitId: row.resident.unit.unitNumber,
        riskScore: row.riskScore,
        riskTier: row.riskTier,
        daysToExpiry: row.daysToExpiry,
        signals: {
          daysToExpiryDays: row.signal?.daysToExpiryDays ?? 0,
          paymentHistoryDelinquent:
            row.signal?.paymentHistoryDelinquent ?? false,
          noRenewalOfferYet: row.signal?.noRenewalOfferYet ?? false,
          rentGrowthAboveMarket: row.signal?.rentGrowthAboveMarket ?? false,
        },
      })),
    };
  }

  async triggerRenewalEvent(propertyId: string, residentId: string) {
    const latestScore = await this.prisma.renewalRiskScore.findFirst({
      where: { propertyId, residentId },
      orderBy: { calculatedAt: 'desc' },
      include: { signal: true },
    });

    if (!latestScore || !latestScore.signal) {
      throw new NotFoundException(
        'No renewal risk score found for resident. Run calculate endpoint first.',
      );
    }

    return this.webhooksService.triggerForRiskScore(latestScore.id);
  }

  private parseDate(input: string): Date {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid asOfDate');
    }

    const normalized = new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      ),
    );
    return normalized;
  }

  private diffDays(fromDate: Date, toDate: Date): number {
    const ms = toDate.getTime() - fromDate.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  private daysToExpirySignal(daysToExpiry: number): number {
    if (daysToExpiry <= 0) {
      return 100;
    }
    if (daysToExpiry <= 30) {
      return 100;
    }
    if (daysToExpiry <= 60) {
      return 90;
    }
    if (daysToExpiry <= 90) {
      return 65;
    }
    if (daysToExpiry <= 180) {
      return 25;
    }
    return 5;
  }

  private toTier(score: number): RiskTier {
    if (score >= 70) {
      return RiskTier.high;
    }
    if (score >= 40) {
      return RiskTier.medium;
    }
    return RiskTier.low;
  }
}
