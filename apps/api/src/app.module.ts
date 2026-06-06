import { Module } from '@nestjs/common';
import { AutomationsModule } from './presentation/automations/automations.module';
import { CampaignsModule } from './presentation/campaigns/campaigns.module';
import { HealthModule } from './presentation/health/health.module';
import { LeadEventsModule } from './presentation/lead-events/lead-events.module';
import { LeadsModule } from './presentation/leads/leads.module';
import { OrganizationsModule } from './presentation/organizations/organizations.module';
import { OutboxModule } from './presentation/outbox/outbox.module';

@Module({
  imports: [
    HealthModule,
    AutomationsModule,
    OrganizationsModule,
    CampaignsModule,
    LeadsModule,
    LeadEventsModule,
    OutboxModule,
  ],
})
export class AppModule {}
