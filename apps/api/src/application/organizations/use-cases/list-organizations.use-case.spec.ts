import { Organization } from '../../../domain/organizations/organization.entity';
import { OrganizationsRepository } from '../organizations.repository';
import { ListOrganizationsUseCase } from './list-organizations.use-case';

class InMemoryOrganizationsRepository implements OrganizationsRepository {
  readonly organizations: Organization[] = [];

  create(organization: Organization): Promise<Organization> {
    this.organizations.push(organization);

    return Promise.resolve(organization);
  }

  findById(id: string): Promise<Organization | null> {
    return Promise.resolve(
      this.organizations.find((organization) => organization.id === id) ?? null,
    );
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return Promise.resolve(
      this.organizations.find((organization) => organization.slug === slug) ?? null,
    );
  }

  list(): Promise<Organization[]> {
    return Promise.resolve(this.organizations);
  }
}

describe('ListOrganizationsUseCase', () => {
  it('lists organizations', async () => {
    const repository = new InMemoryOrganizationsRepository();
    const useCase = new ListOrganizationsUseCase(repository);

    await repository.create(
      Organization.create({
        id: '4aab1c61-02c9-4492-9ec1-08f3b48f8a1e',
        name: 'EduFlow University',
        slug: 'eduflow-university',
      }),
    );

    await repository.create(
      Organization.create({
        id: 'd96aa4b8-9b46-44ab-8806-b3f789d7684d',
        name: 'Academic Hub',
        slug: 'academic-hub',
      }),
    );

    await expect(useCase.execute()).resolves.toHaveLength(2);
  });
});
