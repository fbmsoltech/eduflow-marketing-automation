import { Lead, LeadStatus } from '../../domain/leads/lead.entity';

export const LEADS_REPOSITORY = Symbol('LEADS_REPOSITORY');

export interface LeadsRepository {
  create(lead: Lead): Promise<Lead>;
  findById(id: string): Promise<Lead | null>;
  findByOrganizationIdAndEmail(organizationId: string, email: string): Promise<Lead | null>;
  list(): Promise<Lead[]>;
  listByOrganizationId(organizationId: string): Promise<Lead[]>;
  listByCampaignId(campaignId: string): Promise<Lead[]>;
  updateStatus(id: string, status: LeadStatus): Promise<Lead | null>;
  updateScore(id: string, score: number): Promise<Lead | null>;
}
