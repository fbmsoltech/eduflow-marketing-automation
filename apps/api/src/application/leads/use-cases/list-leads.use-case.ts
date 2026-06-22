import { Inject, Injectable } from '@nestjs/common';
import { Lead } from '../../../domain/leads/lead.entity';
import { LEADS_REPOSITORY, LeadsRepository } from '../leads.repository';

@Injectable()
export class ListLeadsUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
  ) {}

  execute(): Promise<Lead[]> {
    return this.leadsRepository.list();
  }
}
