import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CampaignNotFoundError } from '../../application/campaigns/errors';
import { LeadEventNotFoundError } from '../../application/lead-events/errors';
import { FindLeadEventByIdUseCase } from '../../application/lead-events/use-cases/find-lead-event-by-id.use-case';
import { ListLeadEventsUseCase } from '../../application/lead-events/use-cases/list-lead-events.use-case';
import { ListLeadEventsByCampaignUseCase } from '../../application/lead-events/use-cases/list-lead-events-by-campaign.use-case';
import { ListLeadEventsByLeadUseCase } from '../../application/lead-events/use-cases/list-lead-events-by-lead.use-case';
import { ListLeadEventsByOrganizationUseCase } from '../../application/lead-events/use-cases/list-lead-events-by-organization.use-case';
import { RegisterLeadEventUseCase } from '../../application/lead-events/use-cases/register-lead-event.use-case';
import {
  LeadDoesNotBelongToCampaignError,
  LeadDoesNotBelongToOrganizationError,
} from '../../application/lead-events/errors';
import {
  CampaignDoesNotBelongToOrganizationError,
  LeadNotFoundError,
} from '../../application/leads/errors';
import { OrganizationNotFoundError } from '../../application/organizations/errors';
import {
  EmptyLeadEventIdempotencyKeyError,
  EmptyLeadEventTypeError,
} from '../../domain/lead-events/lead-event.entity';
import { LeadEventResponseDto } from './dto/lead-event-response.dto';
import { RegisterLeadEventDto } from './dto/register-lead-event.dto';

@Controller()
export class LeadEventsController {
  constructor(
    private readonly registerLeadEventUseCase: RegisterLeadEventUseCase,
    private readonly listLeadEventsUseCase: ListLeadEventsUseCase,
    private readonly findLeadEventByIdUseCase: FindLeadEventByIdUseCase,
    private readonly listLeadEventsByOrganizationUseCase: ListLeadEventsByOrganizationUseCase,
    private readonly listLeadEventsByCampaignUseCase: ListLeadEventsByCampaignUseCase,
    private readonly listLeadEventsByLeadUseCase: ListLeadEventsByLeadUseCase,
  ) {}

  @Post('lead-events')
  async register(@Body() body: unknown): Promise<LeadEventResponseDto> {
    const dto = RegisterLeadEventDto.fromBody(body);

    try {
      const leadEvent = await this.registerLeadEventUseCase.execute({
        organizationId: dto.organizationId,
        campaignId: dto.campaignId,
        leadId: dto.leadId,
        eventType: dto.eventType,
        occurredAt: dto.occurredAt,
        payload: dto.payload,
        correlationId: dto.correlationId,
        idempotencyKey: dto.idempotencyKey,
      });

      return LeadEventResponseDto.fromDomain(leadEvent);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('lead-events')
  async list(): Promise<LeadEventResponseDto[]> {
    const leadEvents = await this.listLeadEventsUseCase.execute();

    return leadEvents.map((leadEvent) => LeadEventResponseDto.fromDomain(leadEvent));
  }

  @Get('lead-events/:id')
  async findById(@Param('id') id: string): Promise<LeadEventResponseDto> {
    try {
      const leadEvent = await this.findLeadEventByIdUseCase.execute(id);

      return LeadEventResponseDto.fromDomain(leadEvent);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('organizations/:organizationId/lead-events')
  async listByOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<LeadEventResponseDto[]> {
    try {
      const leadEvents = await this.listLeadEventsByOrganizationUseCase.execute(organizationId);

      return leadEvents.map((leadEvent) => LeadEventResponseDto.fromDomain(leadEvent));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('campaigns/:campaignId/lead-events')
  async listByCampaign(@Param('campaignId') campaignId: string): Promise<LeadEventResponseDto[]> {
    try {
      const leadEvents = await this.listLeadEventsByCampaignUseCase.execute(campaignId);

      return leadEvents.map((leadEvent) => LeadEventResponseDto.fromDomain(leadEvent));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('leads/:leadId/lead-events')
  async listByLead(@Param('leadId') leadId: string): Promise<LeadEventResponseDto[]> {
    try {
      const leadEvents = await this.listLeadEventsByLeadUseCase.execute(leadId);

      return leadEvents.map((leadEvent) => LeadEventResponseDto.fromDomain(leadEvent));
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (
      error instanceof OrganizationNotFoundError ||
      error instanceof CampaignNotFoundError ||
      error instanceof LeadNotFoundError ||
      error instanceof LeadEventNotFoundError
    ) {
      throw new NotFoundException(error.message);
    }

    if (
      error instanceof CampaignDoesNotBelongToOrganizationError ||
      error instanceof LeadDoesNotBelongToOrganizationError ||
      error instanceof LeadDoesNotBelongToCampaignError ||
      error instanceof EmptyLeadEventTypeError ||
      error instanceof EmptyLeadEventIdempotencyKeyError
    ) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
