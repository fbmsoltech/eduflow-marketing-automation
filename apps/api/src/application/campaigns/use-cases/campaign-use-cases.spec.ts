import { randomUUID } from 'node:crypto';
import { Campaign, CampaignStatus } from '../../../domain/campaigns/campaign.entity';
import { Organization } from '../../../domain/organizations/organization.entity';
import { OrganizationNotFoundError } from '../../organizations/errors';
import { OrganizationsRepository } from '../../organizations/organizations.repository';
import { CampaignsRepository } from '../campaigns.repository';
import { CampaignNotFoundError, CampaignSlugAlreadyExistsError } from '../errors';
import { CreateCampaignUseCase } from './create-campaign.use-case';
import { FindCampaignByIdUseCase } from './find-campaign-by-id.use-case';
import { ListCampaignsUseCase } from './list-campaigns.use-case';
import { ListCampaignsByOrganizationUseCase } from './list-campaigns-by-organization.use-case';
import { UpdateCampaignStatusUseCase } from './update-campaign-status.use-case';

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

class InMemoryCampaignsRepository implements CampaignsRepository {
  readonly campaigns: Campaign[] = [];

  create(campaign: Campaign): Promise<Campaign> {
    this.campaigns.push(campaign);

    return Promise.resolve(campaign);
  }

  findById(id: string): Promise<Campaign | null> {
    return Promise.resolve(this.campaigns.find((campaign) => campaign.id === id) ?? null);
  }

  findByOrganizationIdAndSlug(organizationId: string, slug: string): Promise<Campaign | null> {
    return Promise.resolve(
      this.campaigns.find(
        (campaign) => campaign.organizationId === organizationId && campaign.slug === slug,
      ) ?? null,
    );
  }

  list(): Promise<Campaign[]> {
    return Promise.resolve(this.campaigns);
  }

  listByOrganizationId(organizationId: string): Promise<Campaign[]> {
    return Promise.resolve(
      this.campaigns.filter((campaign) => campaign.organizationId === organizationId),
    );
  }

  updateStatus(id: string, status: CampaignStatus): Promise<Campaign | null> {
    const index = this.campaigns.findIndex((campaign) => campaign.id === id);

    if (index === -1) {
      return Promise.resolve(null);
    }

    const campaign = this.campaigns[index];

    if (!campaign) {
      return Promise.resolve(null);
    }

    const updatedCampaign = Campaign.restore({
      ...campaign.toJSON(),
      status,
      updatedAt: new Date(),
    });

    this.campaigns[index] = updatedCampaign;

    return Promise.resolve(updatedCampaign);
  }
}

function createOrganization(repository: InMemoryOrganizationsRepository): Promise<Organization> {
  return repository.create(
    Organization.create({
      id: randomUUID(),
      name: 'EduFlow University',
      slug: 'eduflow-university',
    }),
  );
}

describe('Campaign use cases', () => {
  it('creates a campaign linked to an existing organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new CreateCampaignUseCase(campaignsRepository, organizationsRepository);

    const campaign = await useCase.execute({
      organizationId: organization.id,
      name: 'Selection Process 2026',
      slug: 'selection-process-2026',
      startsAt: new Date('2026-06-01T00:00:00.000Z'),
      endsAt: new Date('2026-07-01T00:00:00.000Z'),
      metadata: { channel: 'website' },
    });

    expect(campaign.id).toEqual(expect.any(String));
    expect(campaign.organizationId).toBe(organization.id);
    expect(campaign.status).toBe(CampaignStatus.DRAFT);
    expect(campaignsRepository.campaigns).toHaveLength(1);
  });

  it('does not create a campaign when organization does not exist', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const useCase = new CreateCampaignUseCase(campaignsRepository, organizationsRepository);

    await expect(
      useCase.execute({
        organizationId: randomUUID(),
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      }),
    ).rejects.toBeInstanceOf(OrganizationNotFoundError);
  });

  it('does not create duplicated slugs inside the same organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new CreateCampaignUseCase(campaignsRepository, organizationsRepository);

    await useCase.execute({
      organizationId: organization.id,
      name: 'Selection Process 2026',
      slug: 'selection-process-2026',
    });

    await expect(
      useCase.execute({
        organizationId: organization.id,
        name: 'Another Selection Process',
        slug: 'selection-process-2026',
      }),
    ).rejects.toBeInstanceOf(CampaignSlugAlreadyExistsError);
  });

  it('lists campaigns', async () => {
    const campaignsRepository = new InMemoryCampaignsRepository();
    const useCase = new ListCampaignsUseCase(campaignsRepository);

    await campaignsRepository.create(
      Campaign.create({
        id: randomUUID(),
        organizationId: randomUUID(),
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      }),
    );

    await expect(useCase.execute()).resolves.toHaveLength(1);
  });

  it('finds a campaign by id', async () => {
    const campaignsRepository = new InMemoryCampaignsRepository();
    const campaign = await campaignsRepository.create(
      Campaign.create({
        id: randomUUID(),
        organizationId: randomUUID(),
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      }),
    );
    const useCase = new FindCampaignByIdUseCase(campaignsRepository);

    await expect(useCase.execute(campaign.id)).resolves.toBe(campaign);
  });

  it('fails when finding a missing campaign', async () => {
    const campaignsRepository = new InMemoryCampaignsRepository();
    const useCase = new FindCampaignByIdUseCase(campaignsRepository);

    await expect(useCase.execute(randomUUID())).rejects.toBeInstanceOf(CampaignNotFoundError);
  });

  it('lists campaigns by organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new ListCampaignsByOrganizationUseCase(
      campaignsRepository,
      organizationsRepository,
    );

    await campaignsRepository.create(
      Campaign.create({
        id: randomUUID(),
        organizationId: organization.id,
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      }),
    );

    await expect(useCase.execute(organization.id)).resolves.toHaveLength(1);
  });

  it('does not list campaigns for a missing organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const useCase = new ListCampaignsByOrganizationUseCase(
      campaignsRepository,
      organizationsRepository,
    );

    await expect(useCase.execute(randomUUID())).rejects.toBeInstanceOf(OrganizationNotFoundError);
  });

  it('updates campaign status', async () => {
    const campaignsRepository = new InMemoryCampaignsRepository();
    const campaign = await campaignsRepository.create(
      Campaign.create({
        id: randomUUID(),
        organizationId: randomUUID(),
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      }),
    );
    const useCase = new UpdateCampaignStatusUseCase(campaignsRepository);

    const updatedCampaign = await useCase.execute({
      id: campaign.id,
      status: CampaignStatus.ACTIVE,
    });

    expect(updatedCampaign.status).toBe(CampaignStatus.ACTIVE);
  });

  it('fails when updating a missing campaign', async () => {
    const campaignsRepository = new InMemoryCampaignsRepository();
    const useCase = new UpdateCampaignStatusUseCase(campaignsRepository);

    await expect(
      useCase.execute({
        id: randomUUID(),
        status: CampaignStatus.ACTIVE,
      }),
    ).rejects.toBeInstanceOf(CampaignNotFoundError);
  });
});
