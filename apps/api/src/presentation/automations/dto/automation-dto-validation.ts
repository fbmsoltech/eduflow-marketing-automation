import { BadRequestException } from '@nestjs/common';
import {
  AutomationJsonObject,
  AutomationJsonValue,
} from '../../../domain/automations/automation-types';

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isJsonValue(value: unknown): value is AutomationJsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

export function parseJsonObject(value: unknown, field: string): AutomationJsonObject {
  if (!isRecord(value) || !isJsonValue(value)) {
    throw new BadRequestException(`${field} must be an object`);
  }
  return value;
}
