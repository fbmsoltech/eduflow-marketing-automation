import { Module } from '@nestjs/common';
import { CAMPAIGNS_REPOSITORY } from '../../application/campaigns/campaigns.repository';
import { CreateCampaignUseCase } from '../../application/campaigns/use-cases/create-campaign.use-case';
import { FindCampaignByIdUseCase } from '../../application/campaigns/use-cases/find-campaign-by-id.use-case';
import { ListCampaignsUseCase } from '../../application/campaigns/use-cases/list-campaigns.use-case';
import { ListCampaignsByOrganizationUseCase } from '../../application/campaigns/use-cases/list-campaigns-by-organization.use-case';
import { UpdateCampaignStatusUseCase } from '../../application/campaigns/use-cases/update-campaign-status.use-case';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaCampaignsRepository } from '../../infrastructure/prisma/repositories/prisma-campaigns.repository';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  controllers: [CampaignsController],
  providers: [
    CreateCampaignUseCase,
    FindCampaignByIdUseCase,
    ListCampaignsUseCase,
    ListCampaignsByOrganizationUseCase,
    UpdateCampaignStatusUseCase,
    {
      provide: CAMPAIGNS_REPOSITORY,
      useClass: PrismaCampaignsRepository,
    },
  ],
  exports: [
    CreateCampaignUseCase,
    FindCampaignByIdUseCase,
    ListCampaignsUseCase,
    ListCampaignsByOrganizationUseCase,
    UpdateCampaignStatusUseCase,
    CAMPAIGNS_REPOSITORY,
  ],
})
export class CampaignsModule {}
