import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationJsonObject,
  AutomationJsonValue,
} from '../../../domain/automations/automation-types';
import { isJsonValue, isRecord, parseJsonObject, UUID_PATTERN } from './automation-dto-validation';

export class AutomationConditionRequestDto {
  @ApiProperty({ example: 'event.payload.link' })
  readonly fieldPath!: string;

  @ApiProperty({
    enum: AutomationConditionOperator,
    example: AutomationConditionOperator.CONTAINS,
  })
  readonly operator!: AutomationConditionOperator;

  @ApiPropertyOptional({ example: 'edital' })
  readonly expectedValue?: AutomationJsonValue;

  @ApiPropertyOptional({ example: 1 })
  readonly sortOrder?: number;
}

export class AutomationActionRequestDto {
  @ApiProperty({
    enum: AutomationActionType,
    example: AutomationActionType.INCREASE_LEAD_SCORE,
  })
  readonly type!: AutomationActionType;

  @ApiProperty({
    example: {
      amount: 10,
    },
    type: 'object',
    additionalProperties: true,
  })
  readonly config!: AutomationJsonObject;

  @ApiPropertyOptional({ example: 1 })
  readonly sortOrder?: number;
}

export class CreateAutomationFlowDto {
  @ApiProperty({ example: 'ORGANIZATION_ID', format: 'uuid' })
  readonly organizationId: string;

  @ApiPropertyOptional({ example: 'CAMPAIGN_ID', format: 'uuid' })
  readonly campaignId: string | undefined;

  @ApiProperty({ example: 'Qualify engaged candidate' })
  readonly name: string;

  @ApiProperty({ example: 'email.clicked' })
  readonly triggerEventType: string;

  @ApiPropertyOptional({
    example: {
      owner: 'admissions-team',
    },
    type: 'object',
    additionalProperties: true,
  })
  readonly metadata: AutomationJsonObject | undefined;

  @ApiProperty({
    type: () => AutomationConditionRequestDto,
    isArray: true,
    example: [
      {
        fieldPath: 'event.payload.link',
        operator: 'CONTAINS',
        expectedValue: 'edital',
        sortOrder: 1,
      },
      {
        fieldPath: 'lead.score',
        operator: 'GREATER_THAN_OR_EQUALS',
        expectedValue: 30,
        sortOrder: 2,
      },
    ],
  })
  readonly conditions: AutomationConditionRequestDto[];

  @ApiProperty({
    type: () => AutomationActionRequestDto,
    isArray: true,
    example: [
      {
        type: 'INCREASE_LEAD_SCORE',
        config: {
          amount: 10,
        },
        sortOrder: 1,
      },
      {
        type: 'UPDATE_LEAD_STATUS',
        config: {
          status: 'QUALIFIED',
        },
        sortOrder: 2,
      },
    ],
  })
  readonly actions: AutomationActionRequestDto[];

  private constructor(
    organizationId: string,
    campaignId: string | undefined,
    name: string,
    triggerEventType: string,
    metadata: AutomationJsonObject | undefined,
    conditions: AutomationConditionRequestDto[],
    actions: AutomationActionRequestDto[],
  ) {
    this.organizationId = organizationId;
    this.campaignId = campaignId;
    this.name = name;
    this.triggerEventType = triggerEventType;
    this.metadata = metadata;
    this.conditions = conditions;
    this.actions = actions;
  }

  static fromBody(body: unknown): CreateAutomationFlowDto {
    if (!isRecord(body)) throw new BadRequestException('Request body must be an object');

    const organizationId = this.parseRequiredUuid(body['organizationId'], 'organizationId');
    const campaignId = this.parseOptionalUuid(body['campaignId'], 'campaignId');
    const name = this.parseRequiredString(body['name'], 'name');
    const triggerEventType = this.parseRequiredString(body['triggerEventType'], 'triggerEventType');
    const metadata =
      body['metadata'] === undefined ? undefined : parseJsonObject(body['metadata'], 'metadata');
    const conditions = this.parseConditions(body['conditions']);
    const actions = this.parseActions(body['actions']);

    return new CreateAutomationFlowDto(
      organizationId,
      campaignId,
      name,
      triggerEventType,
      metadata,
      conditions,
      actions,
    );
  }

  private static parseConditions(value: unknown): AutomationConditionRequestDto[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new BadRequestException('conditions must be an array');

    return value.map((item, index) => {
      if (!isRecord(item)) throw new BadRequestException(`conditions[${index}] must be an object`);
      const operator = item['operator'];
      if (
        typeof operator !== 'string' ||
        !Object.values(AutomationConditionOperator).includes(
          operator as AutomationConditionOperator,
        )
      ) {
        throw new BadRequestException(`conditions[${index}].operator must be a valid enum value`);
      }
      const expectedValue = item['expectedValue'];
      if (expectedValue !== undefined && !isJsonValue(expectedValue)) {
        throw new BadRequestException(`conditions[${index}].expectedValue must be valid JSON`);
      }
      return {
        fieldPath: this.parseRequiredString(item['fieldPath'], `conditions[${index}].fieldPath`),
        operator: operator as AutomationConditionOperator,
        expectedValue,
        sortOrder: this.parseOptionalNumber(item['sortOrder'], `conditions[${index}].sortOrder`),
      };
    });
  }

  private static parseActions(value: unknown): AutomationActionRequestDto[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('actions must be an array with at least one item');
    }
    return value.map((item, index) => {
      if (!isRecord(item)) throw new BadRequestException(`actions[${index}] must be an object`);
      const type = item['type'];
      if (
        typeof type !== 'string' ||
        !Object.values(AutomationActionType).includes(type as AutomationActionType)
      ) {
        throw new BadRequestException(`actions[${index}].type must be a valid enum value`);
      }
      const actionType = type as AutomationActionType;
      const config = parseJsonObject(item['config'], `actions[${index}].config`);

      this.validateActionConfig(actionType, config, index);

      return {
        type: actionType,
        config,
        sortOrder: this.parseOptionalNumber(item['sortOrder'], `actions[${index}].sortOrder`),
      };
    });
  }

  private static validateActionConfig(
    type: AutomationActionType,
    config: AutomationJsonObject,
    index: number,
  ): void {
    const field = `actions[${index}].config`;

    switch (type) {
      case AutomationActionType.INCREASE_LEAD_SCORE:
      case AutomationActionType.DECREASE_LEAD_SCORE:
        if (
          typeof config['amount'] !== 'number' ||
          !Number.isInteger(config['amount']) ||
          config['amount'] <= 0
        ) {
          throw new BadRequestException(`${field}.amount must be a positive integer`);
        }
        return;
      case AutomationActionType.UPDATE_LEAD_STATUS:
        if (
          typeof config['status'] !== 'string' ||
          !['NEW', 'ENGAGED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED', 'ARCHIVED'].includes(
            config['status'],
          )
        ) {
          throw new BadRequestException(`${field}.status must be a valid LeadStatus`);
        }
        return;
      case AutomationActionType.CREATE_TASK:
        this.validateCreateTaskConfig(config, field);
        return;
      case AutomationActionType.SEND_WEBHOOK:
        this.validateSendWebhookConfig(config, field);
        return;
      case AutomationActionType.SEND_NOTIFICATION:
        return;
    }
  }

  private static validateCreateTaskConfig(config: AutomationJsonObject, field: string): void {
    if (typeof config['title'] !== 'string' || !config['title'].trim()) {
      throw new BadRequestException(`${field}.title must be a non-empty string`);
    }
    if (config['description'] !== undefined && typeof config['description'] !== 'string') {
      throw new BadRequestException(`${field}.description must be a string`);
    }
    if (
      config['priority'] !== undefined &&
      (typeof config['priority'] !== 'string' ||
        !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(config['priority']))
    ) {
      throw new BadRequestException(`${field}.priority must be a valid TaskPriority`);
    }
    if (
      config['dueAt'] !== undefined &&
      (typeof config['dueAt'] !== 'string' || Number.isNaN(new Date(config['dueAt']).getTime()))
    ) {
      throw new BadRequestException(`${field}.dueAt must be an ISO date string`);
    }
  }

  private static validateSendWebhookConfig(config: AutomationJsonObject, field: string): void {
    if (typeof config['url'] !== 'string' || !this.isHttpUrl(config['url'])) {
      throw new BadRequestException(`${field}.url must be a valid HTTP URL`);
    }
    if (
      config['method'] !== undefined &&
      (typeof config['method'] !== 'string' || !config['method'].trim())
    ) {
      throw new BadRequestException(`${field}.method must be a non-empty string`);
    }
    const headers = config['headers'];
    if (
      headers !== undefined &&
      (!isRecord(headers) || Object.values(headers).some((value) => typeof value !== 'string'))
    ) {
      throw new BadRequestException(`${field}.headers must contain only string values`);
    }
  }

  private static isHttpUrl(value: string): boolean {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }

  private static parseRequiredUuid(value: unknown, field: string): string {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID`);
    }
    return value;
  }

  private static parseOptionalUuid(value: unknown, field: string): string | undefined {
    return value === undefined ? undefined : this.parseRequiredUuid(value, field);
  }

  private static parseRequiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} must be a non-empty string`);
    }
    return value.trim();
  }

  private static parseOptionalNumber(value: unknown, field: string): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException(`${field} must be a number`);
    }
    return value;
  }
}
