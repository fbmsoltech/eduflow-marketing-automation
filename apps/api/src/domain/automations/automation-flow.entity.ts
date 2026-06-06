import { AutomationAction } from './automation-action.entity';
import { AutomationCondition } from './automation-condition.entity';
import { AutomationFlowStatus, AutomationJsonObject } from './automation-types';

export interface AutomationFlowProps {
  id: string;
  organizationId: string;
  campaignId?: string;
  name: string;
  status: AutomationFlowStatus;
  triggerEventType: string;
  metadata?: AutomationJsonObject;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAutomationFlowProps {
  id: string;
  organizationId: string;
  campaignId?: string;
  name: string;
  status?: AutomationFlowStatus;
  triggerEventType: string;
  metadata?: AutomationJsonObject;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class InvalidAutomationFlowError extends Error {}

export class AutomationFlow {
  private constructor(private readonly props: AutomationFlowProps) {}

  static create(props: CreateAutomationFlowProps): AutomationFlow {
    const name = props.name.trim();
    const triggerEventType = props.triggerEventType.trim();

    if (!name || !triggerEventType || props.actions.length === 0) {
      throw new InvalidAutomationFlowError('Automation flow requires name, trigger and actions');
    }

    const now = new Date();

    return new AutomationFlow({
      ...props,
      name,
      triggerEventType,
      status: props.status ?? AutomationFlowStatus.DRAFT,
      conditions: [...(props.conditions ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
      actions: [...props.actions].sort((a, b) => a.sortOrder - b.sortOrder),
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static restore(props: AutomationFlowProps): AutomationFlow {
    return new AutomationFlow(props);
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
  get name(): string {
    return this.props.name;
  }
  get status(): AutomationFlowStatus {
    return this.props.status;
  }
  get triggerEventType(): string {
    return this.props.triggerEventType;
  }
  get metadata(): AutomationJsonObject | undefined {
    return this.props.metadata;
  }
  get conditions(): AutomationCondition[] {
    return [...this.props.conditions];
  }
  get actions(): AutomationAction[] {
    return [...this.props.actions];
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): AutomationFlowProps {
    return { ...this.props, conditions: this.conditions, actions: this.actions };
  }
}
