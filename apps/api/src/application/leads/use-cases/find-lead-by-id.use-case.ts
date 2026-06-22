import { Inject, Injectable } from '@nestjs/common';
import { Lead } from '../../../domain/leads/lead.entity';
import { LeadNotFoundError } from '../errors';
import { LEADS_REPOSITORY, LeadsRepository } from '../leads.repository';

@Injectable()
export class FindLeadByIdUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
  ) {}

  async execute(id: string): Promise<Lead> {
    const lead = await this.leadsRepository.findById(id);

    if (!lead) {
      throw new LeadNotFoundError(id);
    }

    return lead;
  }
}
