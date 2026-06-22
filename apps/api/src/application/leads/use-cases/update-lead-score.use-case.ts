import { Inject, Injectable } from '@nestjs/common';
import { InvalidLeadScoreError, Lead } from '../../../domain/leads/lead.entity';
import { LeadNotFoundError } from '../errors';
import { LEADS_REPOSITORY, LeadsRepository } from '../leads.repository';

export interface UpdateLeadScoreInput {
  id: string;
  score: number;
}

@Injectable()
export class UpdateLeadScoreUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
  ) {}

  async execute(input: UpdateLeadScoreInput): Promise<Lead> {
    if (input.score < 0) {
      throw new InvalidLeadScoreError(input.score);
    }

    const lead = await this.leadsRepository.updateScore(input.id, input.score);

    if (!lead) {
      throw new LeadNotFoundError(input.id);
    }

    return lead;
  }
}
