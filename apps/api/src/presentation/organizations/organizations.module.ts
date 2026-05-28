import { Module } from '@nestjs/common';
import { CreateOrganizationUseCase } from '../../application/organizations/use-cases/create-organization.use-case';
import { FindOrganizationByIdUseCase } from '../../application/organizations/use-cases/find-organization-by-id.use-case';
import { ListOrganizationsUseCase } from '../../application/organizations/use-cases/list-organizations.use-case';
import { ORGANIZATIONS_REPOSITORY } from '../../application/organizations/organizations.repository';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaOrganizationsRepository } from '../../infrastructure/prisma/repositories/prisma-organizations.repository';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController],
  providers: [
    CreateOrganizationUseCase,
    FindOrganizationByIdUseCase,
    ListOrganizationsUseCase,
    {
      provide: ORGANIZATIONS_REPOSITORY,
      useClass: PrismaOrganizationsRepository,
    },
  ],
  exports: [
    CreateOrganizationUseCase,
    FindOrganizationByIdUseCase,
    ListOrganizationsUseCase,
    ORGANIZATIONS_REPOSITORY,
  ],
})
export class OrganizationsModule {}
