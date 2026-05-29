export class LeadEmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Lead email already exists in organization: ${email}`);
    this.name = 'LeadEmailAlreadyExistsError';
  }
}

export class LeadNotFoundError extends Error {
  constructor(id: string) {
    super(`Lead not found: ${id}`);
    this.name = 'LeadNotFoundError';
  }
}

export class CampaignDoesNotBelongToOrganizationError extends Error {
  constructor(campaignId: string, organizationId: string) {
    super(`Campaign ${campaignId} does not belong to organization ${organizationId}`);
    this.name = 'CampaignDoesNotBelongToOrganizationError';
  }
}
