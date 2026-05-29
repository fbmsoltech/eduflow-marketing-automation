import { Module } from '@nestjs/common';
import { CAMPAIGNS_REPOSITORY } from '../../application/campaigns/campaigns.repository';
import { LEAD_EVENTS_REPOSITORY } from '../../application/lead-events/lead-events.repository';
import { FindLeadEventByIdUseCase } from '../../application/lead-events/use-cases/find-lead-event-by-id.use-case';
import { ListLeadEventsUseCase } from '../../application/lead-events/use-cases/list-lead-events.use-case';
import { ListLeadEventsByCampaignUseCase } from '../../application/lead-events/use-cases/list-lead-events-by-campaign.use-case';
import { ListLeadEventsByLeadUseCase } from '../../application/lead-events/use-cases/list-lead-events-by-lead.use-case';
import { ListLeadEventsByOrganizationUseCase } from '../../application/lead-events/use-cases/list-lead-events-by-organization.use-case';
import { RegisterLeadEventUseCase } from '../../application/lead-events/use-cases/register-lead-event.use-case';
import { LEADS_REPOSITORY } from '../../application/leads/leads.repository';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaCampaignsRepository } from '../../infrastructure/prisma/repositories/prisma-campaigns.repository';
import { PrismaLeadEventsRepository } from '../../infrastructure/prisma/repositories/prisma-lead-events.repository';
import { PrismaLeadsRepository } from '../../infrastructure/prisma/repositories/prisma-leads.repository';
import { OrganizationsModule } from '../organizations/organizations.module';
import { LeadEventsController } from './lead-events.controller';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  controllers: [LeadEventsController],
  providers: [
    RegisterLeadEventUseCase,
    ListLeadEventsUseCase,
    FindLeadEventByIdUseCase,
    ListLeadEventsByOrganizationUseCase,
    ListLeadEventsByCampaignUseCase,
    ListLeadEventsByLeadUseCase,
    {
      provide: LEAD_EVENTS_REPOSITORY,
      useClass: PrismaLeadEventsRepository,
    },
    {
      provide: CAMPAIGNS_REPOSITORY,
      useClass: PrismaCampaignsRepository,
    },
    {
      provide: LEADS_REPOSITORY,
      useClass: PrismaLeadsRepository,
    },
  ],
  exports: [
    RegisterLeadEventUseCase,
    ListLeadEventsUseCase,
    FindLeadEventByIdUseCase,
    ListLeadEventsByOrganizationUseCase,
    ListLeadEventsByCampaignUseCase,
    ListLeadEventsByLeadUseCase,
    LEAD_EVENTS_REPOSITORY,
  ],
})
export class LeadEventsModule {}
