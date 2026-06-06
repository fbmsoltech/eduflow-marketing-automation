export type AutomationJsonValue =
  | string
  | number
  | boolean
  | null
  | AutomationJsonObject
  | AutomationJsonValue[];

export interface AutomationJsonObject {
  [key: string]: AutomationJsonValue;
}

export enum AutomationFlowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum AutomationConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_OR_EQUALS = 'GREATER_THAN_OR_EQUALS',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_OR_EQUALS = 'LESS_THAN_OR_EQUALS',
  EXISTS = 'EXISTS',
  NOT_EXISTS = 'NOT_EXISTS',
}

export enum AutomationActionType {
  CREATE_TASK = 'CREATE_TASK',
  SEND_WEBHOOK = 'SEND_WEBHOOK',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  UPDATE_LEAD_STATUS = 'UPDATE_LEAD_STATUS',
  INCREASE_LEAD_SCORE = 'INCREASE_LEAD_SCORE',
  DECREASE_LEAD_SCORE = 'DECREASE_LEAD_SCORE',
}

export enum AutomationExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
