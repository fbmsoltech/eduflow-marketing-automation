import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AutomationFlowNotFoundError,
  CampaignDoesNotBelongToOrganizationError,
} from '../../application/automations/errors';
import { CreateAutomationFlowUseCase } from '../../application/automations/use-cases/create-automation-flow.use-case';
import { EvaluateAutomationsForLeadEventUseCase } from '../../application/automations/use-cases/evaluate-automations-for-lead-event.use-case';
import { FindAutomationFlowByIdUseCase } from '../../application/automations/use-cases/find-automation-flow-by-id.use-case';
import { ListAutomationFlowsUseCase } from '../../application/automations/use-cases/list-automation-flows.use-case';
import { ListAutomationFlowsByCampaignUseCase } from '../../application/automations/use-cases/list-automation-flows-by-campaign.use-case';
import { ListAutomationFlowsByOrganizationUseCase } from '../../application/automations/use-cases/list-automation-flows-by-organization.use-case';
import { UpdateAutomationFlowStatusUseCase } from '../../application/automations/use-cases/update-automation-flow-status.use-case';
import { CampaignNotFoundError } from '../../application/campaigns/errors';
import { LeadEventNotFoundError } from '../../application/lead-events/errors';
import { OrganizationNotFoundError } from '../../application/organizations/errors';
import { InvalidAutomationFlowError } from '../../domain/automations/automation-flow.entity';
import {
  AutomationFlowResponseDto,
  EvaluateAutomationsResponseDto,
} from './dto/automation-response.dto';
import { CreateAutomationFlowDto } from './dto/create-automation-flow.dto';
import { EvaluateAutomationsDto } from './dto/evaluate-automations.dto';
import { UpdateAutomationFlowStatusDto } from './dto/update-automation-flow-status.dto';

@Controller()
export class AutomationsController {
  constructor(
    private readonly createUseCase: CreateAutomationFlowUseCase,
    private readonly listUseCase: ListAutomationFlowsUseCase,
    private readonly findByIdUseCase: FindAutomationFlowByIdUseCase,
    private readonly listByOrganizationUseCase: ListAutomationFlowsByOrganizationUseCase,
    private readonly listByCampaignUseCase: ListAutomationFlowsByCampaignUseCase,
    private readonly updateStatusUseCase: UpdateAutomationFlowStatusUseCase,
    private readonly evaluateUseCase: EvaluateAutomationsForLeadEventUseCase,
  ) {}

  @Post('automations')
  async create(@Body() body: unknown): Promise<AutomationFlowResponseDto> {
    const dto = CreateAutomationFlowDto.fromBody(body);
    try {
      return AutomationFlowResponseDto.fromDomain(await this.createUseCase.execute(dto));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('automations/evaluate')
  async evaluate(@Body() body: unknown): Promise<EvaluateAutomationsResponseDto> {
    const dto = EvaluateAutomationsDto.fromBody(body);
    try {
      return EvaluateAutomationsResponseDto.fromResult(
        await this.evaluateUseCase.execute(dto.leadEventId),
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('automations')
  async list(): Promise<AutomationFlowResponseDto[]> {
    return (await this.listUseCase.execute()).map((flow) =>
      AutomationFlowResponseDto.fromDomain(flow),
    );
  }

  @Get('automations/:id')
  async findById(@Param('id') id: string): Promise<AutomationFlowResponseDto> {
    try {
      return AutomationFlowResponseDto.fromDomain(await this.findByIdUseCase.execute(id));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('organizations/:organizationId/automations')
  async listByOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<AutomationFlowResponseDto[]> {
    try {
      return (await this.listByOrganizationUseCase.execute(organizationId)).map((flow) =>
        AutomationFlowResponseDto.fromDomain(flow),
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('campaigns/:campaignId/automations')
  async listByCampaign(
    @Param('campaignId') campaignId: string,
  ): Promise<AutomationFlowResponseDto[]> {
    try {
      return (await this.listByCampaignUseCase.execute(campaignId)).map((flow) =>
        AutomationFlowResponseDto.fromDomain(flow),
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch('automations/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AutomationFlowResponseDto> {
    const dto = UpdateAutomationFlowStatusDto.fromBody(body);
    try {
      return AutomationFlowResponseDto.fromDomain(
        await this.updateStatusUseCase.execute(id, dto.status),
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (
      error instanceof AutomationFlowNotFoundError ||
      error instanceof OrganizationNotFoundError ||
      error instanceof CampaignNotFoundError ||
      error instanceof LeadEventNotFoundError
    ) {
      throw new NotFoundException(error.message);
    }
    if (
      error instanceof CampaignDoesNotBelongToOrganizationError ||
      error instanceof InvalidAutomationFlowError
    ) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
