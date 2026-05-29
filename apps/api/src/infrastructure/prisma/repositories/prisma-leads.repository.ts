import { Injectable } from '@nestjs/common';
import { Lead as PrismaLead, LeadStatus as PrismaLeadStatus, Prisma } from '@prisma/client';
import { Lead, LeadMetadata, LeadStatus } from '../../../domain/leads/lead.entity';
import { LeadEmailAlreadyExistsError } from '../../../application/leads/errors';
import { LeadsRepository } from '../../../application/leads/leads.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaLeadsRepository implements LeadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(lead: Lead): Promise<Lead> {
    const data = lead.toJSON();

    try {
      const createdLead = await this.prisma.lead.create({
        data: {
          id: data.id,
          organizationId: data.organizationId,
          campaignId: data.campaignId,
          email: data.email,
          fullName: data.fullName,
          phone: data.phone,
          status: data.status,
          score: data.score,
          metadata: this.toPrismaMetadata(data.metadata),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
      });

      return this.toDomain(createdLead);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new LeadEmailAlreadyExistsError(data.email);
      }

      throw error;
    }
  }

  async findById(id: string): Promise<Lead | null> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
    });

    return lead ? this.toDomain(lead) : null;
  }

  async findByOrganizationIdAndEmail(organizationId: string, email: string): Promise<Lead | null> {
    const lead = await this.prisma.lead.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    });

    return lead ? this.toDomain(lead) : null;
  }

  async list(): Promise<Lead[]> {
    const leads = await this.prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => this.toDomain(lead));
  }

  async listByOrganizationId(organizationId: string): Promise<Lead[]> {
    const leads = await this.prisma.lead.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => this.toDomain(lead));
  }

  async listByCampaignId(campaignId: string): Promise<Lead[]> {
    const leads = await this.prisma.lead.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => this.toDomain(lead));
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead | null> {
    try {
      const lead = await this.prisma.lead.update({
        where: { id },
        data: { status },
      });

      return this.toDomain(lead);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }

      throw error;
    }
  }

  async updateScore(id: string, score: number): Promise<Lead | null> {
    try {
      const lead = await this.prisma.lead.update({
        where: { id },
        data: { score },
      });

      return this.toDomain(lead);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }

      throw error;
    }
  }

  private toDomain(lead: PrismaLead): Lead {
    return Lead.restore({
      id: lead.id,
      organizationId: lead.organizationId,
      campaignId: lead.campaignId ?? undefined,
      email: lead.email,
      fullName: lead.fullName ?? undefined,
      phone: lead.phone ?? undefined,
      status: this.toDomainStatus(lead.status),
      score: lead.score,
      metadata: this.toDomainMetadata(lead.metadata),
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    });
  }

  private toDomainStatus(status: PrismaLeadStatus): LeadStatus {
    switch (status) {
      case PrismaLeadStatus.NEW:
        return LeadStatus.NEW;
      case PrismaLeadStatus.ENGAGED:
        return LeadStatus.ENGAGED;
      case PrismaLeadStatus.QUALIFIED:
        return LeadStatus.QUALIFIED;
      case PrismaLeadStatus.DISQUALIFIED:
        return LeadStatus.DISQUALIFIED;
      case PrismaLeadStatus.CONVERTED:
        return LeadStatus.CONVERTED;
      case PrismaLeadStatus.ARCHIVED:
        return LeadStatus.ARCHIVED;
    }
  }

  private toDomainMetadata(metadata: Prisma.JsonValue): LeadMetadata | undefined {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return undefined;
    }

    return metadata as LeadMetadata;
  }

  private toPrismaMetadata(metadata: LeadMetadata | undefined): Prisma.InputJsonValue | undefined {
    return metadata;
  }
}
