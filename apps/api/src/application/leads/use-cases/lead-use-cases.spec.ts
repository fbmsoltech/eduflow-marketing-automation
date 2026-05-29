import { randomUUID } from 'node:crypto';
import { Campaign, CampaignStatus } from '../../../domain/campaigns/campaign.entity';
import { Lead, LeadStatus } from '../../../domain/leads/lead.entity';
import { Organization } from '../../../domain/organizations/organization.entity';
import { CampaignNotFoundError } from '../../campaigns/errors';
import { CampaignsRepository } from '../../campaigns/campaigns.repository';
import { OrganizationNotFoundError } from '../../organizations/errors';
import { OrganizationsRepository } from '../../organizations/organizations.repository';
import {
  CampaignDoesNotBelongToOrganizationError,
  LeadEmailAlreadyExistsError,
  LeadNotFoundError,
} from '../errors';
import { LeadsRepository } from '../leads.repository';
import { CreateLeadUseCase } from './create-lead.use-case';
import { FindLeadByIdUseCase } from './find-lead-by-id.use-case';
import { ListLeadsUseCase } from './list-leads.use-case';
import { ListLeadsByCampaignUseCase } from './list-leads-by-campaign.use-case';
import { ListLeadsByOrganizationUseCase } from './list-leads-by-organization.use-case';
import { UpdateLeadScoreUseCase } from './update-lead-score.use-case';
import { UpdateLeadStatusUseCase } from './update-lead-status.use-case';

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

class InMemoryLeadsRepository implements LeadsRepository {
  readonly leads: Lead[] = [];

  create(lead: Lead): Promise<Lead> {
    this.leads.push(lead);

    return Promise.resolve(lead);
  }

  findById(id: string): Promise<Lead | null> {
    return Promise.resolve(this.leads.find((lead) => lead.id === id) ?? null);
  }

  findByOrganizationIdAndEmail(organizationId: string, email: string): Promise<Lead | null> {
    return Promise.resolve(
      this.leads.find((lead) => lead.organizationId === organizationId && lead.email === email) ??
        null,
    );
  }

  list(): Promise<Lead[]> {
    return Promise.resolve(this.leads);
  }

  listByOrganizationId(organizationId: string): Promise<Lead[]> {
    return Promise.resolve(this.leads.filter((lead) => lead.organizationId === organizationId));
  }

  listByCampaignId(campaignId: string): Promise<Lead[]> {
    return Promise.resolve(this.leads.filter((lead) => lead.campaignId === campaignId));
  }

  updateStatus(id: string, status: LeadStatus): Promise<Lead | null> {
    const index = this.leads.findIndex((lead) => lead.id === id);

    if (index === -1) {
      return Promise.resolve(null);
    }

    const lead = this.leads[index];

    if (!lead) {
      return Promise.resolve(null);
    }

    const updatedLead = Lead.restore({
      ...lead.toJSON(),
      status,
      updatedAt: new Date(),
    });

    this.leads[index] = updatedLead;

    return Promise.resolve(updatedLead);
  }

  updateScore(id: string, score: number): Promise<Lead | null> {
    const index = this.leads.findIndex((lead) => lead.id === id);

    if (index === -1) {
      return Promise.resolve(null);
    }

    const lead = this.leads[index];

    if (!lead) {
      return Promise.resolve(null);
    }

    const updatedLead = Lead.restore({
      ...lead.toJSON(),
      score,
      updatedAt: new Date(),
    });

    this.leads[index] = updatedLead;

    return Promise.resolve(updatedLead);
  }
}

function createOrganization(repository: InMemoryOrganizationsRepository): Promise<Organization> {
  return repository.create(
    Organization.create({
      id: randomUUID(),
      name: 'EduFlow University',
      slug: `eduflow-university-${randomUUID()}`,
    }),
  );
}

function createCampaign(
  repository: InMemoryCampaignsRepository,
  organizationId: string,
): Promise<Campaign> {
  return repository.create(
    Campaign.create({
      id: randomUUID(),
      organizationId,
      name: 'Selection Process 2026',
      slug: `selection-process-${randomUUID()}`,
    }),
  );
}

describe('Lead use cases', () => {
  it('creates a lead linked to an existing organization and campaign', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const organization = await createOrganization(organizationsRepository);
    const campaign = await createCampaign(campaignsRepository, organization.id);
    const useCase = new CreateLeadUseCase(
      leadsRepository,
      organizationsRepository,
      campaignsRepository,
    );

    const lead = await useCase.execute({
      organizationId: organization.id,
      campaignId: campaign.id,
      email: 'Candidate@Example.com',
      fullName: 'Candidate One',
      phone: '+55 11 99999-0000',
      metadata: { source: 'landing-page' },
    });

    expect(lead.id).toEqual(expect.any(String));
    expect(lead.organizationId).toBe(organization.id);
    expect(lead.campaignId).toBe(campaign.id);
    expect(lead.email).toBe('candidate@example.com');
    expect(lead.status).toBe(LeadStatus.NEW);
    expect(lead.score).toBe(0);
  });

  it('does not create a lead when organization does not exist', async () => {
    const useCase = new CreateLeadUseCase(
      new InMemoryLeadsRepository(),
      new InMemoryOrganizationsRepository(),
      new InMemoryCampaignsRepository(),
    );

    await expect(
      useCase.execute({
        organizationId: randomUUID(),
        email: 'candidate@example.com',
      }),
    ).rejects.toBeInstanceOf(OrganizationNotFoundError);
  });

  it('does not create a lead when campaign does not exist', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new CreateLeadUseCase(
      new InMemoryLeadsRepository(),
      organizationsRepository,
      new InMemoryCampaignsRepository(),
    );

    await expect(
      useCase.execute({
        organizationId: organization.id,
        campaignId: randomUUID(),
        email: 'candidate@example.com',
      }),
    ).rejects.toBeInstanceOf(CampaignNotFoundError);
  });

  it('does not create a lead with a campaign from another organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const organization = await createOrganization(organizationsRepository);
    const anotherOrganization = await createOrganization(organizationsRepository);
    const campaign = await createCampaign(campaignsRepository, anotherOrganization.id);
    const useCase = new CreateLeadUseCase(
      new InMemoryLeadsRepository(),
      organizationsRepository,
      campaignsRepository,
    );

    await expect(
      useCase.execute({
        organizationId: organization.id,
        campaignId: campaign.id,
        email: 'candidate@example.com',
      }),
    ).rejects.toBeInstanceOf(CampaignDoesNotBelongToOrganizationError);
  });

  it('does not create duplicated emails inside the same organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new CreateLeadUseCase(
      leadsRepository,
      organizationsRepository,
      campaignsRepository,
    );

    await useCase.execute({
      organizationId: organization.id,
      email: 'candidate@example.com',
    });

    await expect(
      useCase.execute({
        organizationId: organization.id,
        email: 'Candidate@Example.com',
      }),
    ).rejects.toBeInstanceOf(LeadEmailAlreadyExistsError);
  });

  it('lists leads', async () => {
    const leadsRepository = new InMemoryLeadsRepository();
    const useCase = new ListLeadsUseCase(leadsRepository);

    await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: randomUUID(),
        email: 'candidate@example.com',
      }),
    );

    await expect(useCase.execute()).resolves.toHaveLength(1);
  });

  it('finds a lead by id', async () => {
    const leadsRepository = new InMemoryLeadsRepository();
    const lead = await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: randomUUID(),
        email: 'candidate@example.com',
      }),
    );
    const useCase = new FindLeadByIdUseCase(leadsRepository);

    await expect(useCase.execute(lead.id)).resolves.toBe(lead);
  });

  it('fails when finding a missing lead', async () => {
    const useCase = new FindLeadByIdUseCase(new InMemoryLeadsRepository());

    await expect(useCase.execute(randomUUID())).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it('lists leads by organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new ListLeadsByOrganizationUseCase(leadsRepository, organizationsRepository);

    await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: organization.id,
        email: 'candidate@example.com',
      }),
    );

    await expect(useCase.execute(organization.id)).resolves.toHaveLength(1);
  });

  it('lists leads by campaign', async () => {
    const campaignsRepository = new InMemoryCampaignsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const campaign = await createCampaign(campaignsRepository, randomUUID());
    const useCase = new ListLeadsByCampaignUseCase(leadsRepository, campaignsRepository);

    await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        email: 'candidate@example.com',
      }),
    );

    await expect(useCase.execute(campaign.id)).resolves.toHaveLength(1);
  });

  it('updates lead status', async () => {
    const leadsRepository = new InMemoryLeadsRepository();
    const lead = await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: randomUUID(),
        email: 'candidate@example.com',
      }),
    );
    const useCase = new UpdateLeadStatusUseCase(leadsRepository);

    const updatedLead = await useCase.execute({
      id: lead.id,
      status: LeadStatus.QUALIFIED,
    });

    expect(updatedLead.status).toBe(LeadStatus.QUALIFIED);
  });

  it('updates lead score', async () => {
    const leadsRepository = new InMemoryLeadsRepository();
    const lead = await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: randomUUID(),
        email: 'candidate@example.com',
      }),
    );
    const useCase = new UpdateLeadScoreUseCase(leadsRepository);

    const updatedLead = await useCase.execute({
      id: lead.id,
      score: 35,
    });

    expect(updatedLead.score).toBe(35);
  });
});
