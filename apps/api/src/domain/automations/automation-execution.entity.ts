import { AutomationExecutionStatus, AutomationJsonObject } from './automation-types';

export interface AutomationExecutionProps {
  id: string;
  organizationId: string;
  campaignId?: string;
  flowId: string;
  leadId?: string;
  leadEventId?: string;
  status: AutomationExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  errorMessage?: string;
  metadata?: AutomationJsonObject;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAutomationExecutionProps {
  id: string;
  organizationId: string;
  campaignId?: string;
  flowId: string;
  leadId?: string;
  leadEventId?: string;
  status?: AutomationExecutionStatus;
  startedAt?: Date;
  metadata?: AutomationJsonObject;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AutomationExecution {
  private constructor(private readonly props: AutomationExecutionProps) {}

  static create(props: CreateAutomationExecutionProps): AutomationExecution {
    const now = new Date();

    return new AutomationExecution({
      ...props,
      status: props.status ?? AutomationExecutionStatus.RUNNING,
      startedAt: props.startedAt ?? now,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static restore(props: AutomationExecutionProps): AutomationExecution {
    return new AutomationExecution(props);
  }

  get id(): string {
    return this.props.id;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get campaignId(): string | undefined {
    return this.props.campaignId;
  }
  get flowId(): string {
    return this.props.flowId;
  }
  get leadId(): string | undefined {
    return this.props.leadId;
  }
  get leadEventId(): string | undefined {
    return this.props.leadEventId;
  }
  get status(): AutomationExecutionStatus {
    return this.props.status;
  }
  get startedAt(): Date {
    return this.props.startedAt;
  }
  get finishedAt(): Date | undefined {
    return this.props.finishedAt;
  }
  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }
  get metadata(): AutomationJsonObject | undefined {
    return this.props.metadata;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): AutomationExecutionProps {
    return { ...this.props };
  }
}
