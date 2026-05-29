import { randomUUID } from 'node:crypto';
import { Campaign, CampaignStatus } from '../../../domain/campaigns/campaign.entity';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { Lead, LeadStatus } from '../../../domain/leads/lead.entity';
import { Organization } from '../../../domain/organizations/organization.entity';
import { CampaignNotFoundError } from '../../campaigns/errors';
import { CampaignsRepository } from '../../campaigns/campaigns.repository';
import { CampaignDoesNotBelongToOrganizationError, LeadNotFoundError } from '../../leads/errors';
import { LeadsRepository } from '../../leads/leads.repository';
import { OrganizationNotFoundError } from '../../organizations/errors';
import { OrganizationsRepository } from '../../organizations/organizations.repository';
import {
  LeadDoesNotBelongToCampaignError,
  LeadDoesNotBelongToOrganizationError,
  LeadEventNotFoundError,
} from '../errors';
import { LeadEventsRepository } from '../lead-events.repository';
import { FindLeadEventByIdUseCase } from './find-lead-event-by-id.use-case';
import { ListLeadEventsUseCase } from './list-lead-events.use-case';
import { ListLeadEventsByCampaignUseCase } from './list-lead-events-by-campaign.use-case';
import { ListLeadEventsByLeadUseCase } from './list-lead-events-by-lead.use-case';
import { ListLeadEventsByOrganizationUseCase } from './list-lead-events-by-organization.use-case';
import { RegisterLeadEventUseCase } from './register-lead-event.use-case';

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
    const lead = this.leads.find((item) => item.id === id);

    if (!lead) {
      return Promise.resolve(null);
    }

    return Promise.resolve(Lead.restore({ ...lead.toJSON(), status, updatedAt: new Date() }));
  }

  updateScore(id: string, score: number): Promise<Lead | null> {
    const lead = this.leads.find((item) => item.id === id);

    if (!lead) {
      return Promise.resolve(null);
    }

    return Promise.resolve(Lead.restore({ ...lead.toJSON(), score, updatedAt: new Date() }));
  }
}

class InMemoryLeadEventsRepository implements LeadEventsRepository {
  readonly leadEvents: LeadEvent[] = [];

  create(leadEvent: LeadEvent): Promise<LeadEvent> {
    const existingLeadEvent = this.leadEvents.find(
      (item) =>
        item.organizationId === leadEvent.organizationId &&
        item.idempotencyKey === leadEvent.idempotencyKey,
    );

    if (existingLeadEvent) {
      return Promise.resolve(existingLeadEvent);
    }

    this.leadEvents.push(leadEvent);

    return Promise.resolve(leadEvent);
  }

  findById(id: string): Promise<LeadEvent | null> {
    return Promise.resolve(this.leadEvents.find((leadEvent) => leadEvent.id === id) ?? null);
  }

  findByOrganizationIdAndIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<LeadEvent | null> {
    return Promise.resolve(
      this.leadEvents.find(
        (leadEvent) =>
          leadEvent.organizationId === organizationId &&
          leadEvent.idempotencyKey === idempotencyKey,
      ) ?? null,
    );
  }

  list(): Promise<LeadEvent[]> {
    return Promise.resolve(this.leadEvents);
  }

  listByOrganizationId(organizationId: string): Promise<LeadEvent[]> {
    return Promise.resolve(
      this.leadEvents.filter((leadEvent) => leadEvent.organizationId === organizationId),
    );
  }

  listByCampaignId(campaignId: string): Promise<LeadEvent[]> {
    return Promise.resolve(
      this.leadEvents.filter((leadEvent) => leadEvent.campaignId === campaignId),
    );
  }

  listByLeadId(leadId: string): Promise<LeadEvent[]> {
    return Promise.resolve(this.leadEvents.filter((leadEvent) => leadEvent.leadId === leadId));
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

function createLead(
  repository: InMemoryLeadsRepository,
  organizationId: string,
  campaignId?: string,
): Promise<Lead> {
  return repository.create(
    Lead.create({
      id: randomUUID(),
      organizationId,
      campaignId,
      email: `${randomUUID()}@example.com`,
    }),
  );
}

describe('Lead event use cases', () => {
  it('registers a lead event linked to an existing organization, campaign and lead', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const leadEventsRepository = new InMemoryLeadEventsRepository();
    const organization = await createOrganization(organizationsRepository);
    const campaign = await createCampaign(campaignsRepository, organization.id);
    const lead = await createLead(leadsRepository, organization.id, campaign.id);
    const useCase = new RegisterLeadEventUseCase(
      leadEventsRepository,
      organizationsRepository,
      campaignsRepository,
      leadsRepository,
    );

    const leadEvent = await useCase.execute({
      organizationId: organization.id,
      campaignId: campaign.id,
      leadId: lead.id,
      eventType: 'form.submitted',
      occurredAt: new Date('2026-05-20T10:00:00.000Z'),
      payload: { formId: 'selection-2026' },
      correlationId: 'corr-123',
      idempotencyKey: 'form.submitted:1',
    });

    expect(leadEvent.id).toEqual(expect.any(String));
    expect(leadEvent.eventId).toEqual(expect.any(String));
    expect(leadEvent.organizationId).toBe(organization.id);
    expect(leadEvent.campaignId).toBe(campaign.id);
    expect(leadEvent.leadId).toBe(lead.id);
    expect(leadEvent.payload).toEqual({ formId: 'selection-2026' });
  });

  it('stores an empty object when payload is not informed', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const leadEventsRepository = new InMemoryLeadEventsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new RegisterLeadEventUseCase(
      leadEventsRepository,
      organizationsRepository,
      campaignsRepository,
      leadsRepository,
    );

    const leadEvent = await useCase.execute({
      organizationId: organization.id,
      eventType: 'email.opened',
      occurredAt: new Date('2026-05-20T10:00:00.000Z'),
      idempotencyKey: 'email.opened:1',
    });

    expect(leadEvent.payload).toEqual({});
  });

  it('returns existing event when idempotency key was already used in the organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const leadEventsRepository = new InMemoryLeadEventsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new RegisterLeadEventUseCase(
      leadEventsRepository,
      organizationsRepository,
      campaignsRepository,
      leadsRepository,
    );

    const firstLeadEvent = await useCase.execute({
      organizationId: organization.id,
      eventType: 'email.opened',
      occurredAt: new Date('2026-05-20T10:00:00.000Z'),
      idempotencyKey: 'email.opened:1',
    });
    const secondLeadEvent = await useCase.execute({
      organizationId: organization.id,
      eventType: 'email.clicked',
      occurredAt: new Date('2026-05-21T10:00:00.000Z'),
      idempotencyKey: 'email.opened:1',
    });

    expect(secondLeadEvent).toBe(firstLeadEvent);
    expect(leadEventsRepository.leadEvents).toHaveLength(1);
  });

  it('does not register an event when organization does not exist', async () => {
    const useCase = new RegisterLeadEventUseCase(
      new InMemoryLeadEventsRepository(),
      new InMemoryOrganizationsRepository(),
      new InMemoryCampaignsRepository(),
      new InMemoryLeadsRepository(),
    );

    await expect(
      useCase.execute({
        organizationId: randomUUID(),
        eventType: 'form.submitted',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'form.submitted:1',
      }),
    ).rejects.toBeInstanceOf(OrganizationNotFoundError);
  });

  it('does not register an event when campaign does not exist', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new RegisterLeadEventUseCase(
      new InMemoryLeadEventsRepository(),
      organizationsRepository,
      new InMemoryCampaignsRepository(),
      new InMemoryLeadsRepository(),
    );

    await expect(
      useCase.execute({
        organizationId: organization.id,
        campaignId: randomUUID(),
        eventType: 'form.submitted',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'form.submitted:1',
      }),
    ).rejects.toBeInstanceOf(CampaignNotFoundError);
  });

  it('does not register an event with a campaign from another organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const organization = await createOrganization(organizationsRepository);
    const anotherOrganization = await createOrganization(organizationsRepository);
    const campaign = await createCampaign(campaignsRepository, anotherOrganization.id);
    const useCase = new RegisterLeadEventUseCase(
      new InMemoryLeadEventsRepository(),
      organizationsRepository,
      campaignsRepository,
      new InMemoryLeadsRepository(),
    );

    await expect(
      useCase.execute({
        organizationId: organization.id,
        campaignId: campaign.id,
        eventType: 'form.submitted',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'form.submitted:1',
      }),
    ).rejects.toBeInstanceOf(CampaignDoesNotBelongToOrganizationError);
  });

  it('does not register an event when lead does not exist', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const organization = await createOrganization(organizationsRepository);
    const useCase = new RegisterLeadEventUseCase(
      new InMemoryLeadEventsRepository(),
      organizationsRepository,
      new InMemoryCampaignsRepository(),
      new InMemoryLeadsRepository(),
    );

    await expect(
      useCase.execute({
        organizationId: organization.id,
        leadId: randomUUID(),
        eventType: 'form.submitted',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'form.submitted:1',
      }),
    ).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it('does not register an event with a lead from another organization', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const organization = await createOrganization(organizationsRepository);
    const anotherOrganization = await createOrganization(organizationsRepository);
    const lead = await createLead(leadsRepository, anotherOrganization.id);
    const useCase = new RegisterLeadEventUseCase(
      new InMemoryLeadEventsRepository(),
      organizationsRepository,
      new InMemoryCampaignsRepository(),
      leadsRepository,
    );

    await expect(
      useCase.execute({
        organizationId: organization.id,
        leadId: lead.id,
        eventType: 'form.submitted',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'form.submitted:1',
      }),
    ).rejects.toBeInstanceOf(LeadDoesNotBelongToOrganizationError);
  });

  it('does not register an event when lead belongs to a different campaign', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const organization = await createOrganization(organizationsRepository);
    const campaign = await createCampaign(campaignsRepository, organization.id);
    const anotherCampaign = await createCampaign(campaignsRepository, organization.id);
    const lead = await createLead(leadsRepository, organization.id, anotherCampaign.id);
    const useCase = new RegisterLeadEventUseCase(
      new InMemoryLeadEventsRepository(),
      organizationsRepository,
      campaignsRepository,
      leadsRepository,
    );

    await expect(
      useCase.execute({
        organizationId: organization.id,
        campaignId: campaign.id,
        leadId: lead.id,
        eventType: 'form.submitted',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'form.submitted:1',
      }),
    ).rejects.toBeInstanceOf(LeadDoesNotBelongToCampaignError);
  });

  it('lists and finds lead events', async () => {
    const leadEventsRepository = new InMemoryLeadEventsRepository();
    const leadEvent = await leadEventsRepository.create(
      LeadEvent.create({
        id: randomUUID(),
        eventId: randomUUID(),
        organizationId: randomUUID(),
        eventType: 'email.clicked',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'email.clicked:1',
      }),
    );
    const listUseCase = new ListLeadEventsUseCase(leadEventsRepository);
    const findUseCase = new FindLeadEventByIdUseCase(leadEventsRepository);

    await expect(listUseCase.execute()).resolves.toHaveLength(1);
    await expect(findUseCase.execute(leadEvent.id)).resolves.toBe(leadEvent);
  });

  it('fails when finding a missing lead event', async () => {
    const useCase = new FindLeadEventByIdUseCase(new InMemoryLeadEventsRepository());

    await expect(useCase.execute(randomUUID())).rejects.toBeInstanceOf(LeadEventNotFoundError);
  });

  it('lists lead events by organization, campaign and lead', async () => {
    const organizationsRepository = new InMemoryOrganizationsRepository();
    const campaignsRepository = new InMemoryCampaignsRepository();
    const leadsRepository = new InMemoryLeadsRepository();
    const leadEventsRepository = new InMemoryLeadEventsRepository();
    const organization = await createOrganization(organizationsRepository);
    const campaign = await createCampaign(campaignsRepository, organization.id);
    const lead = await createLead(leadsRepository, organization.id, campaign.id);

    await leadEventsRepository.create(
      LeadEvent.create({
        id: randomUUID(),
        eventId: randomUUID(),
        organizationId: organization.id,
        campaignId: campaign.id,
        leadId: lead.id,
        eventType: 'email.clicked',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'email.clicked:1',
      }),
    );

    await expect(
      new ListLeadEventsByOrganizationUseCase(
        leadEventsRepository,
        organizationsRepository,
      ).execute(organization.id),
    ).resolves.toHaveLength(1);
    await expect(
      new ListLeadEventsByCampaignUseCase(leadEventsRepository, campaignsRepository).execute(
        campaign.id,
      ),
    ).resolves.toHaveLength(1);
    await expect(
      new ListLeadEventsByLeadUseCase(leadEventsRepository, leadsRepository).execute(lead.id),
    ).resolves.toHaveLength(1);
  });
});
