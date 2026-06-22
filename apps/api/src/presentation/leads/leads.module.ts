import { Module } from '@nestjs/common';
import { CAMPAIGNS_REPOSITORY } from '../../application/campaigns/campaigns.repository';
import { CreateLeadUseCase } from '../../application/leads/use-cases/create-lead.use-case';
import { FindLeadByIdUseCase } from '../../application/leads/use-cases/find-lead-by-id.use-case';
import { ListLeadsUseCase } from '../../application/leads/use-cases/list-leads.use-case';
import { ListLeadsByCampaignUseCase } from '../../application/leads/use-cases/list-leads-by-campaign.use-case';
import { ListLeadsByOrganizationUseCase } from '../../application/leads/use-cases/list-leads-by-organization.use-case';
import { UpdateLeadScoreUseCase } from '../../application/leads/use-cases/update-lead-score.use-case';
import { UpdateLeadStatusUseCase } from '../../application/leads/use-cases/update-lead-status.use-case';
import { LEADS_REPOSITORY } from '../../application/leads/leads.repository';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaCampaignsRepository } from '../../infrastructure/prisma/repositories/prisma-campaigns.repository';
import { PrismaLeadsRepository } from '../../infrastructure/prisma/repositories/prisma-leads.repository';
import { OrganizationsModule } from '../organizations/organizations.module';
import { LeadsController } from './leads.controller';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  controllers: [LeadsController],
  providers: [
    CreateLeadUseCase,
    FindLeadByIdUseCase,
    ListLeadsUseCase,
    ListLeadsByOrganizationUseCase,
    ListLeadsByCampaignUseCase,
    UpdateLeadStatusUseCase,
    UpdateLeadScoreUseCase,
    {
      provide: LEADS_REPOSITORY,
      useClass: PrismaLeadsRepository,
    },
    {
      provide: CAMPAIGNS_REPOSITORY,
      useClass: PrismaCampaignsRepository,
    },
  ],
  exports: [
    CreateLeadUseCase,
    FindLeadByIdUseCase,
    ListLeadsUseCase,
    ListLeadsByOrganizationUseCase,
    ListLeadsByCampaignUseCase,
    UpdateLeadStatusUseCase,
    UpdateLeadScoreUseCase,
    LEADS_REPOSITORY,
  ],
})
export class LeadsModule {}
