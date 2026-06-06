import { Module } from '@nestjs/common';
import { AUTOMATIONS_REPOSITORY } from '../../application/automations/automations.repository';
import { AutomationActionDispatcherService } from '../../application/automations/services/automation-action-dispatcher.service';
import { AutomationConditionEvaluatorService } from '../../application/automations/services/automation-condition-evaluator.service';
import { AutomationFieldResolverService } from '../../application/automations/services/automation-field-resolver.service';
import { CreateAutomationFlowUseCase } from '../../application/automations/use-cases/create-automation-flow.use-case';
import { EvaluateAutomationsForLeadEventUseCase } from '../../application/automations/use-cases/evaluate-automations-for-lead-event.use-case';
import { FindAutomationFlowByIdUseCase } from '../../application/automations/use-cases/find-automation-flow-by-id.use-case';
import { ListAutomationFlowsUseCase } from '../../application/automations/use-cases/list-automation-flows.use-case';
import { ListAutomationFlowsByCampaignUseCase } from '../../application/automations/use-cases/list-automation-flows-by-campaign.use-case';
import { ListAutomationFlowsByOrganizationUseCase } from '../../application/automations/use-cases/list-automation-flows-by-organization.use-case';
import { UpdateAutomationFlowStatusUseCase } from '../../application/automations/use-cases/update-automation-flow-status.use-case';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaAutomationsRepository } from '../../infrastructure/prisma/repositories/prisma-automations.repository';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { LeadEventsModule } from '../lead-events/lead-events.module';
import { LeadsModule } from '../leads/leads.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AutomationsController } from './automations.controller';

@Module({
  imports: [PrismaModule, OrganizationsModule, CampaignsModule, LeadsModule, LeadEventsModule],
  controllers: [AutomationsController],
  providers: [
    CreateAutomationFlowUseCase,
    ListAutomationFlowsUseCase,
    FindAutomationFlowByIdUseCase,
    ListAutomationFlowsByOrganizationUseCase,
    ListAutomationFlowsByCampaignUseCase,
    UpdateAutomationFlowStatusUseCase,
    EvaluateAutomationsForLeadEventUseCase,
    AutomationFieldResolverService,
    AutomationConditionEvaluatorService,
    AutomationActionDispatcherService,
    { provide: AUTOMATIONS_REPOSITORY, useClass: PrismaAutomationsRepository },
  ],
  exports: [AUTOMATIONS_REPOSITORY, EvaluateAutomationsForLeadEventUseCase],
})
export class AutomationsModule {}
