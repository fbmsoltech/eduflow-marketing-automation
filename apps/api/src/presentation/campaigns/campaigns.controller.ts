import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  InvalidCampaignNameError,
  InvalidCampaignPeriodError,
  InvalidCampaignSlugError,
} from '../../domain/campaigns/campaign.entity';
import { OrganizationNotFoundError } from '../../application/organizations/errors';
import {
  CampaignNotFoundError,
  CampaignSlugAlreadyExistsError,
} from '../../application/campaigns/errors';
import { CreateCampaignUseCase } from '../../application/campaigns/use-cases/create-campaign.use-case';
import { FindCampaignByIdUseCase } from '../../application/campaigns/use-cases/find-campaign-by-id.use-case';
import { ListCampaignsUseCase } from '../../application/campaigns/use-cases/list-campaigns.use-case';
import { ListCampaignsByOrganizationUseCase } from '../../application/campaigns/use-cases/list-campaigns-by-organization.use-case';
import { UpdateCampaignStatusUseCase } from '../../application/campaigns/use-cases/update-campaign-status.use-case';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';

@Controller()
export class CampaignsController {
  constructor(
    private readonly createCampaignUseCase: CreateCampaignUseCase,
    private readonly listCampaignsUseCase: ListCampaignsUseCase,
    private readonly findCampaignByIdUseCase: FindCampaignByIdUseCase,
    private readonly listCampaignsByOrganizationUseCase: ListCampaignsByOrganizationUseCase,
    private readonly updateCampaignStatusUseCase: UpdateCampaignStatusUseCase,
  ) {}

  @Post('campaigns')
  async create(@Body() body: unknown): Promise<CampaignResponseDto> {
    const dto = CreateCampaignDto.fromBody(body);

    try {
      const campaign = await this.createCampaignUseCase.execute({
        organizationId: dto.organizationId,
        name: dto.name,
        slug: dto.slug,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        metadata: dto.metadata,
      });

      return CampaignResponseDto.fromDomain(campaign);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('campaigns')
  async list(): Promise<CampaignResponseDto[]> {
    const campaigns = await this.listCampaignsUseCase.execute();

    return campaigns.map((campaign) => CampaignResponseDto.fromDomain(campaign));
  }

  @Get('campaigns/:id')
  async findById(@Param('id') id: string): Promise<CampaignResponseDto> {
    try {
      const campaign = await this.findCampaignByIdUseCase.execute(id);

      return CampaignResponseDto.fromDomain(campaign);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('organizations/:organizationId/campaigns')
  async listByOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<CampaignResponseDto[]> {
    try {
      const campaigns = await this.listCampaignsByOrganizationUseCase.execute(organizationId);

      return campaigns.map((campaign) => CampaignResponseDto.fromDomain(campaign));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch('campaigns/:id/status')
  async updateStatus(@Param('id') id: string, @Body() body: unknown): Promise<CampaignResponseDto> {
    const dto = UpdateCampaignStatusDto.fromBody(body);

    try {
      const campaign = await this.updateCampaignStatusUseCase.execute({
        id,
        status: dto.status,
      });

      return CampaignResponseDto.fromDomain(campaign);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof CampaignSlugAlreadyExistsError) {
      throw new ConflictException('Campaign slug already exists in organization');
    }

    if (error instanceof OrganizationNotFoundError) {
      throw new NotFoundException('Organization not found');
    }

    if (error instanceof CampaignNotFoundError) {
      throw new NotFoundException('Campaign not found');
    }

    if (
      error instanceof InvalidCampaignNameError ||
      error instanceof InvalidCampaignSlugError ||
      error instanceof InvalidCampaignPeriodError
    ) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
