import { Injectable } from '@nestjs/common';
import {
  Campaign as PrismaCampaign,
  CampaignStatus as PrismaCampaignStatus,
  Prisma,
} from '@prisma/client';
import {
  Campaign,
  CampaignMetadata,
  CampaignStatus,
} from '../../../domain/campaigns/campaign.entity';
import { CampaignSlugAlreadyExistsError } from '../../../application/campaigns/errors';
import { CampaignsRepository } from '../../../application/campaigns/campaigns.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaCampaignsRepository implements CampaignsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(campaign: Campaign): Promise<Campaign> {
    const data = campaign.toJSON();

    try {
      const createdCampaign = await this.prisma.campaign.create({
        data: {
          id: data.id,
          organizationId: data.organizationId,
          name: data.name,
          slug: data.slug,
          status: data.status,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          metadata: this.toPrismaMetadata(data.metadata),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
      });

      return this.toDomain(createdCampaign);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new CampaignSlugAlreadyExistsError(data.slug);
      }

      throw error;
    }
  }

  async findById(id: string): Promise<Campaign | null> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
    });

    return campaign ? this.toDomain(campaign) : null;
  }

  async findByOrganizationIdAndSlug(
    organizationId: string,
    slug: string,
  ): Promise<Campaign | null> {
    const campaign = await this.prisma.campaign.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    });

    return campaign ? this.toDomain(campaign) : null;
  }

  async list(): Promise<Campaign[]> {
    const campaigns = await this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((campaign) => this.toDomain(campaign));
  }

  async listByOrganizationId(organizationId: string): Promise<Campaign[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((campaign) => this.toDomain(campaign));
  }

  async updateStatus(id: string, status: CampaignStatus): Promise<Campaign | null> {
    try {
      const campaign = await this.prisma.campaign.update({
        where: { id },
        data: { status },
      });

      return this.toDomain(campaign);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }

      throw error;
    }
  }

  private toDomain(campaign: PrismaCampaign): Campaign {
    return Campaign.restore({
      id: campaign.id,
      organizationId: campaign.organizationId,
      name: campaign.name,
      slug: campaign.slug,
      status: this.toDomainStatus(campaign.status),
      startsAt: campaign.startsAt ?? undefined,
      endsAt: campaign.endsAt ?? undefined,
      metadata: this.toDomainMetadata(campaign.metadata),
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    });
  }

  private toDomainStatus(status: PrismaCampaignStatus): CampaignStatus {
    switch (status) {
      case PrismaCampaignStatus.DRAFT:
        return CampaignStatus.DRAFT;
      case PrismaCampaignStatus.ACTIVE:
        return CampaignStatus.ACTIVE;
      case PrismaCampaignStatus.PAUSED:
        return CampaignStatus.PAUSED;
      case PrismaCampaignStatus.FINISHED:
        return CampaignStatus.FINISHED;
      case PrismaCampaignStatus.ARCHIVED:
        return CampaignStatus.ARCHIVED;
    }
  }

  private toDomainMetadata(metadata: Prisma.JsonValue): CampaignMetadata | undefined {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return undefined;
    }

    return metadata as CampaignMetadata;
  }

  private toPrismaMetadata(
    metadata: CampaignMetadata | undefined,
  ): Prisma.InputJsonValue | undefined {
    return metadata;
  }
}
