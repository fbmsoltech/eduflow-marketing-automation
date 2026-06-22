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
import { CampaignNotFoundError } from '../../application/campaigns/errors';
import { OrganizationNotFoundError } from '../../application/organizations/errors';
import { InvalidLeadEmailError, InvalidLeadScoreError } from '../../domain/leads/lead.entity';
import { CreateLeadUseCase } from '../../application/leads/use-cases/create-lead.use-case';
import { FindLeadByIdUseCase } from '../../application/leads/use-cases/find-lead-by-id.use-case';
import { ListLeadsUseCase } from '../../application/leads/use-cases/list-leads.use-case';
import { ListLeadsByCampaignUseCase } from '../../application/leads/use-cases/list-leads-by-campaign.use-case';
import { ListLeadsByOrganizationUseCase } from '../../application/leads/use-cases/list-leads-by-organization.use-case';
import { UpdateLeadScoreUseCase } from '../../application/leads/use-cases/update-lead-score.use-case';
import { UpdateLeadStatusUseCase } from '../../application/leads/use-cases/update-lead-status.use-case';
import {
  CampaignDoesNotBelongToOrganizationError,
  LeadEmailAlreadyExistsError,
  LeadNotFoundError,
} from '../../application/leads/errors';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { UpdateLeadScoreDto } from './dto/update-lead-score.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Leads')
@ApiInternalServerErrorResponse({
  description: 'Unexpected internal server error',
  type: ErrorResponseDto,
})
@Controller()
export class LeadsController {
  constructor(
    private readonly createLeadUseCase: CreateLeadUseCase,
    private readonly listLeadsUseCase: ListLeadsUseCase,
    private readonly findLeadByIdUseCase: FindLeadByIdUseCase,
    private readonly listLeadsByOrganizationUseCase: ListLeadsByOrganizationUseCase,
    private readonly listLeadsByCampaignUseCase: ListLeadsByCampaignUseCase,
    private readonly updateLeadStatusUseCase: UpdateLeadStatusUseCase,
    private readonly updateLeadScoreUseCase: UpdateLeadScoreUseCase,
  ) {}

  @Post('leads')
  @ApiOperation({ summary: 'Create Lead' })
  @ApiBody({ type: CreateLeadDto })
  @ApiCreatedResponse({ description: 'Lead created', type: LeadResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid lead payload', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Organization or campaign not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Lead email already exists in the organization',
    type: ErrorResponseDto,
  })
  async create(@Body() body: unknown): Promise<LeadResponseDto> {
    const dto = CreateLeadDto.fromBody(body);

    try {
      const lead = await this.createLeadUseCase.execute({
        organizationId: dto.organizationId,
        campaignId: dto.campaignId,
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        metadata: dto.metadata,
      });

      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('leads')
  @ApiOperation({ summary: 'List leads' })
  @ApiOkResponse({ description: 'Leads returned', type: LeadResponseDto, isArray: true })
  async list(): Promise<LeadResponseDto[]> {
    const leads = await this.listLeadsUseCase.execute();

    return leads.map((lead) => LeadResponseDto.fromDomain(lead));
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Lead ID' })
  @ApiOkResponse({ description: 'Lead returned', type: LeadResponseDto })
  @ApiNotFoundResponse({ description: 'Lead not found', type: ErrorResponseDto })
  async findById(@Param('id') id: string): Promise<LeadResponseDto> {
    try {
      const lead = await this.findLeadByIdUseCase.execute(id);

      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('organizations/:organizationId/leads')
  @ApiOperation({ summary: 'List leads by organization' })
  @ApiParam({ name: 'organizationId', format: 'uuid', description: 'Organization ID' })
  @ApiOkResponse({ description: 'Leads returned', type: LeadResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Organization not found', type: ErrorResponseDto })
  async listByOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<LeadResponseDto[]> {
    try {
      const leads = await this.listLeadsByOrganizationUseCase.execute(organizationId);

      return leads.map((lead) => LeadResponseDto.fromDomain(lead));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('campaigns/:campaignId/leads')
  @ApiOperation({ summary: 'List leads by campaign' })
  @ApiParam({ name: 'campaignId', format: 'uuid', description: 'Campaign ID' })
  @ApiOkResponse({ description: 'Leads returned', type: LeadResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Campaign not found', type: ErrorResponseDto })
  async listByCampaign(@Param('campaignId') campaignId: string): Promise<LeadResponseDto[]> {
    try {
      const leads = await this.listLeadsByCampaignUseCase.execute(campaignId);

      return leads.map((lead) => LeadResponseDto.fromDomain(lead));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch('leads/:id/status')
  @ApiOperation({ summary: 'Update lead status' })
  @ApiBody({ type: UpdateLeadStatusDto })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Lead ID' })
  @ApiOkResponse({ description: 'Lead status updated', type: LeadResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid lead status', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Lead not found', type: ErrorResponseDto })
  async updateStatus(@Param('id') id: string, @Body() body: unknown): Promise<LeadResponseDto> {
    const dto = UpdateLeadStatusDto.fromBody(body);

    try {
      const lead = await this.updateLeadStatusUseCase.execute({
        id,
        status: dto.status,
      });

      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch('leads/:id/score')
  @ApiOperation({ summary: 'Update lead score' })
  @ApiBody({ type: UpdateLeadScoreDto })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Lead ID' })
  @ApiOkResponse({ description: 'Lead score updated', type: LeadResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid lead score', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Lead not found', type: ErrorResponseDto })
  async updateScore(@Param('id') id: string, @Body() body: unknown): Promise<LeadResponseDto> {
    const dto = UpdateLeadScoreDto.fromBody(body);

    try {
      const lead = await this.updateLeadScoreUseCase.execute({
        id,
        score: dto.score,
      });

      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof LeadEmailAlreadyExistsError) {
      throw new ConflictException('Lead email already exists in organization');
    }

    if (
      error instanceof OrganizationNotFoundError ||
      error instanceof CampaignNotFoundError ||
      error instanceof LeadNotFoundError
    ) {
      throw new NotFoundException(error.message);
    }

    if (
      error instanceof CampaignDoesNotBelongToOrganizationError ||
      error instanceof InvalidLeadEmailError ||
      error instanceof InvalidLeadScoreError
    ) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
