import { AutomationConditionOperator, AutomationJsonValue } from './automation-types';

export interface AutomationConditionProps {
  id: string;
  flowId: string;
  fieldPath: string;
  operator: AutomationConditionOperator;
  expectedValue?: AutomationJsonValue;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAutomationConditionProps {
  id: string;
  flowId: string;
  fieldPath: string;
  operator: AutomationConditionOperator;
  expectedValue?: AutomationJsonValue;
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AutomationCondition {
  private constructor(private readonly props: AutomationConditionProps) {}

  static create(props: CreateAutomationConditionProps): AutomationCondition {
    const now = new Date();

    return new AutomationCondition({
      ...props,
      fieldPath: props.fieldPath.trim(),
      sortOrder: props.sortOrder ?? 0,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static restore(props: AutomationConditionProps): AutomationCondition {
    return new AutomationCondition(props);
  }

  get id(): string {
    return this.props.id;
  }
  get flowId(): string {
    return this.props.flowId;
  }
  get fieldPath(): string {
    return this.props.fieldPath;
  }
  get operator(): AutomationConditionOperator {
    return this.props.operator;
  }
  get expectedValue(): AutomationJsonValue | undefined {
    return this.props.expectedValue;
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

  toJSON(): AutomationConditionProps {
    return { ...this.props };
  }
}
