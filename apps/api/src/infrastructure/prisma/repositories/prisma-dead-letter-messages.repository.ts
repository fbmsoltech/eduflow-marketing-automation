import { Injectable } from '@nestjs/common';
import { DeadLetterMessage as PrismaDeadLetterMessage, Prisma } from '@prisma/client';
import { DeadLetterMessagesRepository } from '../../../application/dead-letter/dead-letter-messages.repository';
import {
  DeadLetterJsonObject,
  DeadLetterMessage,
} from '../../../domain/dead-letter/dead-letter-message.entity';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaDeadLetterMessagesRepository implements DeadLetterMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(message: DeadLetterMessage): Promise<DeadLetterMessage> {
    const data = message.toJSON();
    const created = await this.prisma.deadLetterMessage.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        outboxMessageId: data.outboxMessageId,
        eventType: data.eventType,
        payload: data.payload,
        reason: data.reason,
        errorDetails: data.errorDetails,
        status: data.status,
        failedAt: data.failedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<DeadLetterMessage | null> {
    const message = await this.prisma.deadLetterMessage.findUnique({ where: { id } });
    return message ? this.toDomain(message) : null;
  }

  async list(): Promise<DeadLetterMessage[]> {
    const messages = await this.prisma.deadLetterMessage.findMany({
      orderBy: { failedAt: 'desc' },
    });
    return messages.map((message) => this.toDomain(message));
  }

  async ignore(id: string): Promise<DeadLetterMessage | null> {
    try {
      const message = await this.prisma.deadLetterMessage.update({
        where: { id },
        data: { status: 'IGNORED' },
      });
      return this.toDomain(message);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  private toDomain(message: PrismaDeadLetterMessage): DeadLetterMessage {
    return DeadLetterMessage.restore({
      id: message.id,
      organizationId: message.organizationId ?? undefined,
      outboxMessageId: message.outboxMessageId ?? undefined,
      eventType: message.eventType,
      payload: this.toObject(message.payload),
      reason: message.reason,
      errorDetails: message.errorDetails ? this.toObject(message.errorDetails) : undefined,
      status: message.status,
      failedAt: message.failedAt,
      reprocessedAt: message.reprocessedAt ?? undefined,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });
  }

  private toObject(value: Prisma.JsonValue): DeadLetterJsonObject {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as DeadLetterJsonObject)
      : {};
  }
}
