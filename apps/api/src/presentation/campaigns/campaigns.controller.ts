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
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Campaigns')
@ApiInternalServerErrorResponse({
  description: 'Unexpected internal server error',
  type: ErrorResponseDto,
})
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
  @ApiOperation({ summary: 'Create Campaign' })
  @ApiBody({ type: CreateCampaignDto })
  @ApiCreatedResponse({ description: 'Campaign created', type: CampaignResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid campaign payload', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found', type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Campaign slug already exists in the organization',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({ summary: 'List campaigns' })
  @ApiOkResponse({ description: 'Campaigns returned', type: CampaignResponseDto, isArray: true })
  async list(): Promise<CampaignResponseDto[]> {
    const campaigns = await this.listCampaignsUseCase.execute();

    return campaigns.map((campaign) => CampaignResponseDto.fromDomain(campaign));
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Campaign ID' })
  @ApiOkResponse({ description: 'Campaign returned', type: CampaignResponseDto })
  @ApiNotFoundResponse({ description: 'Campaign not found', type: ErrorResponseDto })
  async findById(@Param('id') id: string): Promise<CampaignResponseDto> {
    try {
      const campaign = await this.findCampaignByIdUseCase.execute(id);

      return CampaignResponseDto.fromDomain(campaign);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('organizations/:organizationId/campaigns')
  @ApiOperation({ summary: 'List campaigns by organization' })
  @ApiParam({ name: 'organizationId', format: 'uuid', description: 'Organization ID' })
  @ApiOkResponse({ description: 'Campaigns returned', type: CampaignResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Organization not found', type: ErrorResponseDto })
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
  @ApiOperation({ summary: 'Update campaign status' })
  @ApiBody({ type: UpdateCampaignStatusDto })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Campaign ID' })
  @ApiOkResponse({ description: 'Campaign status updated', type: CampaignResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid campaign status', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Campaign not found', type: ErrorResponseDto })
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
