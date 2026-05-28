export class OrganizationSlugAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Organization slug already exists: ${slug}`);
    this.name = 'OrganizationSlugAlreadyExistsError';
  }
}

export class OrganizationNotFoundError extends Error {
  constructor(id: string) {
    super(`Organization not found: ${id}`);
    this.name = 'OrganizationNotFoundError';
  }
}
