import { Injectable } from '@nestjs/common';
import { OutboxMessage as PrismaOutboxMessage, Prisma } from '@prisma/client';
import {
  OutboxMessage,
  OutboxMessagePayload,
  OutboxMessageStatus,
} from '../../../domain/outbox/outbox-message.entity';
import { OutboxMessagesRepository } from '../../../application/outbox/outbox-messages.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaOutboxMessagesRepository implements OutboxMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(outboxMessage: OutboxMessage): Promise<OutboxMessage> {
    const data = outboxMessage.toJSON();

    const createdOutboxMessage = await this.prisma.outboxMessage.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        aggregateId: data.aggregateId,
        aggregateType: data.aggregateType,
        eventType: data.eventType,
        payload: data.payload,
        status: data.status,
        attempts: data.attempts,
        occurredAt: data.occurredAt,
        publishedAt: data.publishedAt,
        lastError: data.lastError,
        correlationId: data.correlationId,
        idempotencyKey: data.idempotencyKey,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomain(createdOutboxMessage);
  }

  async findById(id: string): Promise<OutboxMessage | null> {
    const outboxMessage = await this.prisma.outboxMessage.findUnique({
      where: { id },
    });

    return outboxMessage ? this.toDomain(outboxMessage) : null;
  }

  async list(): Promise<OutboxMessage[]> {
    const outboxMessages = await this.prisma.outboxMessage.findMany({
      orderBy: { occurredAt: 'desc' },
    });

    return outboxMessages.map((outboxMessage) => this.toDomain(outboxMessage));
  }

  async listPending(limit: number): Promise<OutboxMessage[]> {
    const outboxMessages = await this.prisma.outboxMessage.findMany({
      where: { status: 'PENDING' },
      orderBy: { occurredAt: 'asc' },
      take: limit,
    });

    return outboxMessages.map((outboxMessage) => this.toDomain(outboxMessage));
  }

  async markAsPublished(id: string, publishedAt: Date): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt,
        attempts: { increment: 1 },
        lastError: null,
      },
    });
  }

  async markAsFailed(id: string, lastError: string): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
        lastError,
      },
    });
  }

  private toDomain(outboxMessage: PrismaOutboxMessage): OutboxMessage {
    return OutboxMessage.restore({
      id: outboxMessage.id,
      organizationId: outboxMessage.organizationId ?? undefined,
      aggregateId: outboxMessage.aggregateId,
      aggregateType: outboxMessage.aggregateType,
      eventType: outboxMessage.eventType,
      payload: this.toDomainPayload(outboxMessage.payload),
      status: this.toDomainStatus(outboxMessage.status),
      attempts: outboxMessage.attempts,
      occurredAt: outboxMessage.occurredAt,
      publishedAt: outboxMessage.publishedAt ?? undefined,
      lastError: outboxMessage.lastError ?? undefined,
      correlationId: outboxMessage.correlationId ?? undefined,
      idempotencyKey: outboxMessage.idempotencyKey ?? undefined,
      createdAt: outboxMessage.createdAt,
      updatedAt: outboxMessage.updatedAt,
    });
  }

  private toDomainPayload(payload: Prisma.JsonValue): OutboxMessagePayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }

    return payload as OutboxMessagePayload;
  }

  private toDomainStatus(status: PrismaOutboxMessage['status']): OutboxMessageStatus {
    return status;
  }
}
