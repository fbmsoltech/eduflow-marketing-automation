import { Organization } from '../../../domain/organizations/organization.entity';
import { OrganizationSlugAlreadyExistsError } from '../errors';
import { OrganizationsRepository } from '../organizations.repository';
import { CreateOrganizationUseCase } from './create-organization.use-case';

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

describe('CreateOrganizationUseCase', () => {
  it('creates an organization', async () => {
    const repository = new InMemoryOrganizationsRepository();
    const useCase = new CreateOrganizationUseCase(repository);

    const organization = await useCase.execute({
      name: 'EduFlow University',
      slug: 'eduflow-university',
    });

    expect(organization.id).toEqual(expect.any(String));
    expect(organization.name).toBe('EduFlow University');
    expect(organization.slug).toBe('eduflow-university');
    expect(repository.organizations).toHaveLength(1);
  });

  it('does not create organizations with duplicated slugs', async () => {
    const repository = new InMemoryOrganizationsRepository();
    const useCase = new CreateOrganizationUseCase(repository);

    await useCase.execute({
      name: 'EduFlow University',
      slug: 'eduflow-university',
    });

    await expect(
      useCase.execute({
        name: 'Another EduFlow',
        slug: 'eduflow-university',
      }),
    ).rejects.toBeInstanceOf(OrganizationSlugAlreadyExistsError);
  });
});
