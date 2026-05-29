import { Inject, Injectable } from '@nestjs/common';
import { Lead, LeadStatus } from '../../../domain/leads/lead.entity';
import { LeadNotFoundError } from '../errors';
import { LEADS_REPOSITORY, LeadsRepository } from '../leads.repository';

export interface UpdateLeadStatusInput {
  id: string;
  status: LeadStatus;
}

@Injectable()
export class UpdateLeadStatusUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
  ) {}

  async execute(input: UpdateLeadStatusInput): Promise<Lead> {
    const lead = await this.leadsRepository.updateStatus(input.id, input.status);

    if (!lead) {
      throw new LeadNotFoundError(input.id);
    }

    return lead;
  }
}
