import { Injectable } from '@nestjs/common';
import { AutomationCondition } from '../../../domain/automations/automation-condition.entity';
import { AutomationConditionOperator } from '../../../domain/automations/automation-types';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { AutomationFieldResolverService } from './automation-field-resolver.service';

@Injectable()
export class AutomationConditionEvaluatorService {
  constructor(private readonly fieldResolver: AutomationFieldResolverService) {}

  async evaluate(condition: AutomationCondition, event: LeadEvent): Promise<boolean> {
    const actual = await this.fieldResolver.resolve(condition.fieldPath, event);
    const expected = condition.expectedValue;

    switch (condition.operator) {
      case AutomationConditionOperator.EXISTS:
        return actual !== undefined && actual !== null;
      case AutomationConditionOperator.NOT_EXISTS:
        return actual === undefined || actual === null;
      case AutomationConditionOperator.EQUALS:
        return this.equals(actual, expected);
      case AutomationConditionOperator.NOT_EQUALS:
        return !this.equals(actual, expected);
      case AutomationConditionOperator.CONTAINS:
        return this.contains(actual, expected);
      case AutomationConditionOperator.NOT_CONTAINS:
        return !this.contains(actual, expected);
      case AutomationConditionOperator.GREATER_THAN:
        return this.compare(actual, expected) > 0;
      case AutomationConditionOperator.GREATER_THAN_OR_EQUALS:
        return this.compare(actual, expected) >= 0;
      case AutomationConditionOperator.LESS_THAN:
        return this.compare(actual, expected) < 0;
      case AutomationConditionOperator.LESS_THAN_OR_EQUALS:
        return this.compare(actual, expected) <= 0;
    }
  }

  async evaluateAll(conditions: AutomationCondition[], event: LeadEvent): Promise<boolean> {
    for (const condition of conditions) {
      if (!(await this.evaluate(condition, event))) return false;
    }

    return true;
  }

  private equals(actual: unknown, expected: unknown): boolean {
    if (actual instanceof Date && typeof expected === 'string') {
      return actual.getTime() === new Date(expected).getTime();
    }

    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  private contains(actual: unknown, expected: unknown): boolean {
    if (typeof actual === 'string' && typeof expected === 'string')
      return actual.includes(expected);
    if (Array.isArray(actual)) return actual.some((item) => this.equals(item, expected));
    return false;
  }

  private compare(actual: unknown, expected: unknown): number {
    const actualValue = this.toComparable(actual);
    const expectedValue = this.toComparable(expected);

    if (actualValue === undefined || expectedValue === undefined) return Number.NaN;
    return actualValue === expectedValue ? 0 : actualValue > expectedValue ? 1 : -1;
  }

  private toComparable(value: unknown): number | string | undefined {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number' || typeof value === 'string') return value;
    return undefined;
  }
}
