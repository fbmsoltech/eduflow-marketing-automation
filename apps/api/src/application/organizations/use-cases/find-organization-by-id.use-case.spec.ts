import { Organization } from '../../../domain/organizations/organization.entity';
import { OrganizationNotFoundError } from '../errors';
import { OrganizationsRepository } from '../organizations.repository';
import { FindOrganizationByIdUseCase } from './find-organization-by-id.use-case';

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

describe('FindOrganizationByIdUseCase', () => {
  it('finds an organization by id', async () => {
    const repository = new InMemoryOrganizationsRepository();
    const useCase = new FindOrganizationByIdUseCase(repository);
    const organization = await repository.create(
      Organization.create({
        id: '4aab1c61-02c9-4492-9ec1-08f3b48f8a1e',
        name: 'EduFlow University',
        slug: 'eduflow-university',
      }),
    );

    await expect(useCase.execute(organization.id)).resolves.toBe(organization);
  });

  it('fails when the organization does not exist', async () => {
    const repository = new InMemoryOrganizationsRepository();
    const useCase = new FindOrganizationByIdUseCase(repository);

    await expect(useCase.execute('681f0ad2-8270-4897-a268-01853dc18756')).rejects.toBeInstanceOf(
      OrganizationNotFoundError,
    );
  });
});
