export class CampaignSlugAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Campaign slug already exists in organization: ${slug}`);
    this.name = 'CampaignSlugAlreadyExistsError';
  }
}

export class CampaignNotFoundError extends Error {
  constructor(id: string) {
    super(`Campaign not found: ${id}`);
    this.name = 'CampaignNotFoundError';
  }
}
