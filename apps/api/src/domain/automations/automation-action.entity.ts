import { AutomationActionType, AutomationJsonObject } from './automation-types';

export interface AutomationActionProps {
  id: string;
  flowId: string;
  type: AutomationActionType;
  config: AutomationJsonObject;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAutomationActionProps {
  id: string;
  flowId: string;
  type: AutomationActionType;
  config: AutomationJsonObject;
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AutomationAction {
  private constructor(private readonly props: AutomationActionProps) {}

  static create(props: CreateAutomationActionProps): AutomationAction {
    const now = new Date();

    return new AutomationAction({
      ...props,
      sortOrder: props.sortOrder ?? 0,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static restore(props: AutomationActionProps): AutomationAction {
    return new AutomationAction(props);
  }

  get id(): string {
    return this.props.id;
  }
  get flowId(): string {
    return this.props.flowId;
  }
  get type(): AutomationActionType {
    return this.props.type;
  }
  get config(): AutomationJsonObject {
    return this.props.config;
  }
  get sortOrder(): number {
    return this.props.sortOrder;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): AutomationActionProps {
    return { ...this.props };
  }
}
