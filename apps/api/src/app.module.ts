import { Module } from '@nestjs/common';
import { CampaignsModule } from './presentation/campaigns/campaigns.module';
import { HealthModule } from './presentation/health/health.module';
import { OrganizationsModule } from './presentation/organizations/organizations.module';

@Module({
  imports: [HealthModule, OrganizationsModule, CampaignsModule],
})
export class AppModule {}
