import { createHmac, randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryStatus, Prisma, RenewalRiskScore } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WebhooksService {
  private static readonly RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async triggerForRiskScore(riskScoreId: string): Promise<{
    eventId: string;
    deliveryStatus: DeliveryStatus;
    attemptCount: number;
  }> {
    const score = await this.prisma.renewalRiskScore.findUnique({
      where: { id: riskScoreId },
      include: {
        resident: {
          include: { unit: true },
        },
        signal: true,
      },
    });

    if (!score || !score.signal) {
      throw new NotFoundException('Risk score not found or missing signals');
    }

    const existingEvent = await this.prisma.renewalEvent.findFirst({
      where: {
        renewalRiskScoreId: score.id,
        eventType: 'renewal.risk_flagged',
      },
      include: { deliveryState: true },
    });

    if (existingEvent?.deliveryState) {
      return {
        eventId: existingEvent.eventId,
        deliveryStatus: existingEvent.deliveryState.status,
        attemptCount: existingEvent.deliveryState.attemptCount,
      };
    }

    const eventId = `evt-${randomUUID()}`;
    const payload = this.buildPayload(score, score.signal, eventId);

    const renewalEvent = await this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.renewalEvent.create({
        data: {
          eventId,
          propertyId: score.propertyId,
          residentId: score.residentId,
          renewalRiskScoreId: score.id,
          eventType: 'renewal.risk_flagged',
          payload: payload as Prisma.InputJsonValue,
        },
      });

      await tx.webhookDeliveryState.create({
        data: {
          eventId: createdEvent.id,
          propertyId: score.propertyId,
          residentId: score.residentId,
          status: DeliveryStatus.pending,
          attemptCount: 0,
        },
      });

      return createdEvent;
    });

    return this.deliverWithRetry(renewalEvent.id);
  }

  async deliverWithRetry(renewalEventDbId: string): Promise<{
    eventId: string;
    deliveryStatus: DeliveryStatus;
    attemptCount: number;
  }> {
    const event = await this.prisma.renewalEvent.findUnique({
      where: { id: renewalEventDbId },
      include: { deliveryState: true },
    });

    if (!event || !event.deliveryState) {
      throw new NotFoundException('Renewal event delivery state not found');
    }

    if (event.deliveryState.status === DeliveryStatus.delivered) {
      return {
        eventId: event.eventId,
        deliveryStatus: event.deliveryState.status,
        attemptCount: event.deliveryState.attemptCount,
      };
    }

    const endpoint = this.configService.get<string>('RMS_WEBHOOK_URL');
    if (!endpoint) {
      throw new NotFoundException('RMS_WEBHOOK_URL is not configured');
    }

    // For take-home speed we retry inline... production should offload retries
    // to a queue/worker that polls next_retry_at and processes asynchronously.
    for (
      let index = 0;
      index < WebhooksService.RETRY_DELAYS_MS.length;
      index += 1
    ) {
      const attemptNumber = index + 1;
      const isLastAttempt =
        attemptNumber === WebhooksService.RETRY_DELAYS_MS.length;

      try {
        const response = await axios.post(endpoint, event.payload, {
          timeout: 1500,
          headers: {
            'content-type': 'application/json',
            'x-idempotency-key': event.eventId,
            'x-westface-signature': this.signPayload(event.payload),
          },
        });

        const deliveredState = await this.prisma.$transaction(async (tx) => {
          const updatedState = await tx.webhookDeliveryState.update({
            where: { eventId: event.id },
            data: {
              status: DeliveryStatus.delivered,
              attemptCount: attemptNumber,
              lastAttemptAt: new Date(),
              nextRetryAt: null,
              lastHttpStatus: response.status,
              lastError: null,
              rmsResponse: this.toInputJson(response.data),
            },
          });

          await tx.webhookDeliveryAttempt.create({
            data: {
              webhookStateId: updatedState.id,
              attemptNumber,
              successful: true,
              statusCode: response.status,
              responseBody: this.toInputJson(response.data),
              attemptedAt: new Date(),
            },
          });

          return updatedState;
        });

        return {
          eventId: event.eventId,
          deliveryStatus: deliveredState.status,
          attemptCount: deliveredState.attemptCount,
        };
      } catch (error) {
        const parsedError = this.parseAxiosError(error);
        const nextRetryAt = isLastAttempt
          ? null
          : new Date(Date.now() + WebhooksService.RETRY_DELAYS_MS[index]);

        const failedState = await this.prisma.$transaction(async (tx) => {
          const updatedState = await tx.webhookDeliveryState.update({
            where: { eventId: event.id },
            data: {
              status: isLastAttempt
                ? DeliveryStatus.dlq
                : DeliveryStatus.failed,
              attemptCount: attemptNumber,
              lastAttemptAt: new Date(),
              nextRetryAt,
              lastHttpStatus: parsedError.statusCode,
              lastError: parsedError.message,
              rmsResponse: parsedError.responseBody,
            },
          });

          await tx.webhookDeliveryAttempt.create({
            data: {
              webhookStateId: updatedState.id,
              attemptNumber,
              successful: false,
              statusCode: parsedError.statusCode,
              responseBody: parsedError.responseBody,
              errorMessage: parsedError.message,
              attemptedAt: new Date(),
            },
          });

          if (isLastAttempt) {
            await tx.webhookDeadLetterQueue.upsert({
              where: { webhookStateId: updatedState.id },
              create: {
                webhookStateId: updatedState.id,
                eventId: event.id,
                propertyId: updatedState.propertyId,
                residentId: updatedState.residentId,
                reason: 'max_retries_exceeded',
                lastError: parsedError.message,
                payload: this.toInputJson(event.payload),
              },
              update: {
                reason: 'max_retries_exceeded',
                lastError: parsedError.message,
                payload: this.toInputJson(event.payload),
              },
            });
          }

          return updatedState;
        });

        if (isLastAttempt) {
          return {
            eventId: event.eventId,
            deliveryStatus: failedState.status,
            attemptCount: failedState.attemptCount,
          };
        }

        await this.sleep(WebhooksService.RETRY_DELAYS_MS[index]);
      }
    }

    return {
      eventId: event.eventId,
      deliveryStatus: DeliveryStatus.dlq,
      attemptCount: WebhooksService.RETRY_DELAYS_MS.length,
    };
  }

  private buildPayload(
    score: RenewalRiskScore,
    signal: {
      daysToExpiryDays: number;
      paymentHistoryDelinquent: boolean;
      noRenewalOfferYet: boolean;
      rentGrowthAboveMarket: boolean;
    },
    eventId: string,
  ): Prisma.InputJsonObject {
    return {
      event: 'renewal.risk_flagged',
      eventId,
      timestamp: new Date().toISOString(),
      propertyId: score.propertyId,
      residentId: score.residentId,
      data: {
        riskScore: score.riskScore,
        riskTier: score.riskTier,
        daysToExpiry: score.daysToExpiry,
        signals: {
          daysToExpiryDays: signal.daysToExpiryDays,
          paymentHistoryDelinquent: signal.paymentHistoryDelinquent,
          noRenewalOfferYet: signal.noRenewalOfferYet,
          rentGrowthAboveMarket: signal.rentGrowthAboveMarket,
        },
      },
    };
  }

  private signPayload(payload: unknown): string {
    const secret =
      this.configService.get<string>('RMS_WEBHOOK_SECRET') ?? 'dev-secret';
    return createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private parseAxiosError(error: unknown): {
    statusCode: number | null;
    message: string;
    responseBody: Prisma.InputJsonValue | undefined;
  } {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status ?? null;
      return {
        statusCode,
        message: axiosError.message,
        responseBody: this.toInputJson(axiosError.response?.data),
      };
    }

    return {
      statusCode: null,
      message: error instanceof Error ? error.message : 'Unknown webhook error',
      responseBody: undefined,
    };
  }

  private toInputJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
