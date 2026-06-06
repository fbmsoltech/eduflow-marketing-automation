export class AutomationFlowNotFoundError extends Error {
  constructor(id: string) {
    super(`Automation flow not found: ${id}`);
  }
}

export class CampaignDoesNotBelongToOrganizationError extends Error {
  constructor() {
    super('Campaign does not belong to organization');
  }
}

export class UnsupportedAutomationActionError extends Error {
  constructor(type: string) {
    super(`Automation action ${type} is not supported in this phase`);
  }
}

export class InvalidAutomationActionConfigError extends Error {
  constructor(type: string, reason?: string) {
    super(`Invalid config for automation action ${type}${reason ? `: ${reason}` : ''}`);
  }
}

export class AutomationActionRequiresLeadError extends Error {
  constructor(type: string) {
    super(`Automation action ${type} requires a lead`);
  }
}
