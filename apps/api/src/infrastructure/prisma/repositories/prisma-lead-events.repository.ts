import { Injectable } from '@nestjs/common';
import { LeadEvent as PrismaLeadEvent, Prisma } from '@prisma/client';
import { LeadEvent, LeadEventPayload } from '../../../domain/lead-events/lead-event.entity';
import { OutboxMessage } from '../../../domain/outbox/outbox-message.entity';
import { LeadEventsRepository } from '../../../application/lead-events/lead-events.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaLeadEventsRepository implements LeadEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(leadEvent: LeadEvent): Promise<LeadEvent> {
    const data = leadEvent.toJSON();

    try {
      const createdLeadEvent = await this.prisma.leadEvent.create({
        data: {
          id: data.id,
          eventId: data.eventId,
          eventType: data.eventType,
          organizationId: data.organizationId,
          campaignId: data.campaignId,
          leadId: data.leadId,
          occurredAt: data.occurredAt,
          payload: data.payload,
          correlationId: data.correlationId,
          idempotencyKey: data.idempotencyKey,
          createdAt: data.createdAt,
        },
      });

      return this.toDomain(createdLeadEvent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existingLeadEvent = await this.findByOrganizationIdAndIdempotencyKey(
          data.organizationId,
          data.idempotencyKey,
        );

        if (existingLeadEvent) {
          return existingLeadEvent;
        }
      }

      throw error;
    }
  }

  async createWithOutboxMessage(
    leadEvent: LeadEvent,
    outboxMessage: OutboxMessage,
  ): Promise<LeadEvent> {
    const leadEventData = leadEvent.toJSON();
    const outboxMessageData = outboxMessage.toJSON();

    try {
      const createdLeadEvent = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.leadEvent.create({
          data: {
            id: leadEventData.id,
            eventId: leadEventData.eventId,
            eventType: leadEventData.eventType,
            organizationId: leadEventData.organizationId,
            campaignId: leadEventData.campaignId,
            leadId: leadEventData.leadId,
            occurredAt: leadEventData.occurredAt,
            payload: leadEventData.payload,
            correlationId: leadEventData.correlationId,
            idempotencyKey: leadEventData.idempotencyKey,
            createdAt: leadEventData.createdAt,
          },
        });

        await transaction.outboxMessage.create({
          data: {
            id: outboxMessageData.id,
            organizationId: outboxMessageData.organizationId,
            aggregateId: outboxMessageData.aggregateId,
            aggregateType: outboxMessageData.aggregateType,
            eventType: outboxMessageData.eventType,
            payload: outboxMessageData.payload,
            status: outboxMessageData.status,
            attempts: outboxMessageData.attempts,
            occurredAt: outboxMessageData.occurredAt,
            publishedAt: outboxMessageData.publishedAt,
            lastError: outboxMessageData.lastError,
            correlationId: outboxMessageData.correlationId,
            idempotencyKey: outboxMessageData.idempotencyKey,
            createdAt: outboxMessageData.createdAt,
            updatedAt: outboxMessageData.updatedAt,
          },
        });

        return created;
      });

      return this.toDomain(createdLeadEvent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existingLeadEvent = await this.findByOrganizationIdAndIdempotencyKey(
          leadEventData.organizationId,
          leadEventData.idempotencyKey,
        );

        if (existingLeadEvent) {
          return existingLeadEvent;
        }
      }

      throw error;
    }
  }

  async findById(id: string): Promise<LeadEvent | null> {
    const leadEvent = await this.prisma.leadEvent.findUnique({
      where: { id },
    });

    return leadEvent ? this.toDomain(leadEvent) : null;
  }

  async findByOrganizationIdAndIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<LeadEvent | null> {
    const leadEvent = await this.prisma.leadEvent.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey,
        },
      },
    });

    return leadEvent ? this.toDomain(leadEvent) : null;
  }

  async list(): Promise<LeadEvent[]> {
    const leadEvents = await this.prisma.leadEvent.findMany({
      orderBy: { occurredAt: 'desc' },
    });

    return leadEvents.map((leadEvent) => this.toDomain(leadEvent));
  }

  async listByOrganizationId(organizationId: string): Promise<LeadEvent[]> {
    const leadEvents = await this.prisma.leadEvent.findMany({
      where: { organizationId },
      orderBy: { occurredAt: 'desc' },
    });

    return leadEvents.map((leadEvent) => this.toDomain(leadEvent));
  }

  async listByCampaignId(campaignId: string): Promise<LeadEvent[]> {
    const leadEvents = await this.prisma.leadEvent.findMany({
      where: { campaignId },
      orderBy: { occurredAt: 'desc' },
    });

    return leadEvents.map((leadEvent) => this.toDomain(leadEvent));
  }

  async listByLeadId(leadId: string): Promise<LeadEvent[]> {
    const leadEvents = await this.prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { occurredAt: 'desc' },
    });

    return leadEvents.map((leadEvent) => this.toDomain(leadEvent));
  }

  private toDomain(leadEvent: PrismaLeadEvent): LeadEvent {
    return LeadEvent.restore({
      id: leadEvent.id,
      eventId: leadEvent.eventId,
      eventType: leadEvent.eventType,
      organizationId: leadEvent.organizationId,
      campaignId: leadEvent.campaignId ?? undefined,
      leadId: leadEvent.leadId ?? undefined,
      occurredAt: leadEvent.occurredAt,
      payload: this.toDomainPayload(leadEvent.payload),
      correlationId: leadEvent.correlationId ?? undefined,
      idempotencyKey: leadEvent.idempotencyKey,
      createdAt: leadEvent.createdAt,
    });
  }

  private toDomainPayload(payload: Prisma.JsonValue): LeadEventPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }

    return payload as LeadEventPayload;
  }
}
