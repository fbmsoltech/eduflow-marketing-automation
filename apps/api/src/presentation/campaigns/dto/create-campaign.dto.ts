import { BadRequestException } from '@nestjs/common';
import { CampaignMetadata, CampaignMetadataValue } from '../../../domain/campaigns/campaign.entity';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCampaignDto {
  constructor(
    readonly organizationId: string,
    readonly name: string,
    readonly slug: string,
    readonly startsAt?: Date,
    readonly endsAt?: Date,
    readonly metadata?: CampaignMetadata,
  ) {}

  static fromBody(body: unknown): CreateCampaignDto {
    if (!this.isRecord(body)) {
      throw new BadRequestException('Request body must be an object');
    }

    const organizationId = body['organizationId'];
    const name = body['name'];
    const slug = body['slug'];
    const startsAt = body['startsAt'];
    const endsAt = body['endsAt'];
    const metadata = body['metadata'];

    if (typeof organizationId !== 'string' || !UUID_PATTERN.test(organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID');
    }

    if (typeof name !== 'string' || !name.trim()) {
      throw new BadRequestException('name must be a non-empty string');
    }

    if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
      throw new BadRequestException('slug must be a valid URL slug');
    }

    const parsedStartsAt = this.parseOptionalIsoDate(startsAt, 'startsAt');
    const parsedEndsAt = this.parseOptionalIsoDate(endsAt, 'endsAt');

    if (metadata !== undefined && !this.isCampaignMetadata(metadata)) {
      throw new BadRequestException('metadata must be an object');
    }

    return new CreateCampaignDto(
      organizationId,
      name,
      slug,
      parsedStartsAt,
      parsedEndsAt,
      metadata,
    );
  }

  private static parseOptionalIsoDate(value: unknown, field: string): Date | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be an ISO date string`);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be an ISO date string`);
    }

    return date;
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private static isCampaignMetadata(value: unknown): value is CampaignMetadata {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.values(value).every((item) => this.isCampaignMetadataValue(item));
  }

  private static isCampaignMetadataValue(value: unknown): value is CampaignMetadataValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.isCampaignMetadataValue(item));
    }

    return this.isCampaignMetadata(value);
  }
}
