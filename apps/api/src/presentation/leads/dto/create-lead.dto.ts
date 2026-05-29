import { BadRequestException } from '@nestjs/common';
import { LeadMetadata, LeadMetadataValue } from '../../../domain/leads/lead.entity';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CreateLeadDto {
  constructor(
    readonly organizationId: string,
    readonly email: string,
    readonly campaignId?: string,
    readonly fullName?: string,
    readonly phone?: string,
    readonly metadata?: LeadMetadata,
  ) {}

  static fromBody(body: unknown): CreateLeadDto {
    if (!this.isRecord(body)) {
      throw new BadRequestException('Request body must be an object');
    }

    const organizationId = body['organizationId'];
    const campaignId = body['campaignId'];
    const email = body['email'];
    const fullName = body['fullName'];
    const phone = body['phone'];
    const metadata = body['metadata'];

    if (typeof organizationId !== 'string' || !UUID_PATTERN.test(organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID');
    }

    if (
      campaignId !== undefined &&
      (typeof campaignId !== 'string' || !UUID_PATTERN.test(campaignId))
    ) {
      throw new BadRequestException('campaignId must be a valid UUID');
    }

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim().toLowerCase())) {
      throw new BadRequestException('email must be a valid email address');
    }

    if (fullName !== undefined && typeof fullName !== 'string') {
      throw new BadRequestException('fullName must be a string');
    }

    if (phone !== undefined && typeof phone !== 'string') {
      throw new BadRequestException('phone must be a string');
    }

    if (metadata !== undefined && !this.isLeadMetadata(metadata)) {
      throw new BadRequestException('metadata must be an object');
    }

    return new CreateLeadDto(organizationId, email, campaignId, fullName, phone, metadata);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private static isLeadMetadata(value: unknown): value is LeadMetadata {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.values(value).every((item) => this.isLeadMetadataValue(item));
  }

  private static isLeadMetadataValue(value: unknown): value is LeadMetadataValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.isLeadMetadataValue(item));
    }

    return this.isLeadMetadata(value);
  }
}
