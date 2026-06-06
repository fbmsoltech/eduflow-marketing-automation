import { AutomationExecution } from '../../domain/automations/automation-execution.entity';
import { AutomationFlow } from '../../domain/automations/automation-flow.entity';
import {
  AutomationFlowStatus,
  AutomationJsonObject,
} from '../../domain/automations/automation-types';

export const AUTOMATIONS_REPOSITORY = Symbol('AUTOMATIONS_REPOSITORY');

export interface CreateTaskInput {
  organizationId: string;
  campaignId?: string;
  leadId?: string;
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueAt?: Date;
  metadata?: AutomationJsonObject;
}

export interface AutomationsRepository {
  create(flow: AutomationFlow): Promise<AutomationFlow>;
  findById(id: string): Promise<AutomationFlow | null>;
  list(): Promise<AutomationFlow[]>;
  listByOrganizationId(organizationId: string): Promise<AutomationFlow[]>;
  listByCampaignId(campaignId: string): Promise<AutomationFlow[]>;
  listActiveForLeadEvent(
    organizationId: string,
    eventType: string,
    campaignId?: string,
  ): Promise<AutomationFlow[]>;
  updateStatus(id: string, status: AutomationFlowStatus): Promise<AutomationFlow | null>;
  createExecution(execution: AutomationExecution): Promise<AutomationExecution>;
  finishExecution(
    id: string,
    status: 'SUCCEEDED' | 'FAILED',
    errorMessage?: string,
  ): Promise<AutomationExecution>;
  createTask(input: CreateTaskInput): Promise<void>;
}
