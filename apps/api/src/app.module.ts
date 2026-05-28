import { Module } from '@nestjs/common';
import { HealthModule } from './presentation/health/health.module';
import { OrganizationsModule } from './presentation/organizations/organizations.module';

@Module({
  imports: [HealthModule, OrganizationsModule],
})
export class AppModule {}
