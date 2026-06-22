export class LeadEventNotFoundError extends Error {
  constructor(id: string) {
    super(`Lead event not found: ${id}`);
    this.name = 'LeadEventNotFoundError';
  }
}

export class LeadDoesNotBelongToOrganizationError extends Error {
  constructor(leadId: string, organizationId: string) {
    super(`Lead ${leadId} does not belong to organization ${organizationId}`);
    this.name = 'LeadDoesNotBelongToOrganizationError';
  }
}

export class LeadDoesNotBelongToCampaignError extends Error {
  constructor(leadId: string, campaignId: string) {
    super(`Lead ${leadId} does not belong to campaign ${campaignId}`);
    this.name = 'LeadDoesNotBelongToCampaignError';
  }
}
