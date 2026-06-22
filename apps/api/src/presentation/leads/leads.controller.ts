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
  async list(): Promise<LeadResponseDto[]> {
    const leads = await this.listLeadsUseCase.execute();

    return leads.map((lead) => LeadResponseDto.fromDomain(lead));
  }

  @Get('leads/:id')
  async findById(@Param('id') id: string): Promise<LeadResponseDto> {
    try {
      const lead = await this.findLeadByIdUseCase.execute(id);

      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('organizations/:organizationId/leads')
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
  async listByCampaign(@Param('campaignId') campaignId: string): Promise<LeadResponseDto[]> {
    try {
      const leads = await this.listLeadsByCampaignUseCase.execute(campaignId);

      return leads.map((lead) => LeadResponseDto.fromDomain(lead));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch('leads/:id/status')
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
