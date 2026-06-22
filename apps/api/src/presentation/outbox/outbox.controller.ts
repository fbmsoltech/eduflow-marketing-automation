import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OutboxMessageNotFoundError } from '../../application/outbox/errors';
import { FindOutboxMessageByIdUseCase } from '../../application/outbox/use-cases/find-outbox-message-by-id.use-case';
import { ListOutboxMessagesUseCase } from '../../application/outbox/use-cases/list-outbox-messages.use-case';
import {
  PublishPendingOutboxMessagesResult,
  PublishPendingOutboxMessagesUseCase,
} from '../../application/outbox/use-cases/publish-pending-outbox-messages.use-case';
import { OutboxMessageResponseDto } from './dto/outbox-message-response.dto';
import { PublishOutboxMessagesDto } from './dto/publish-outbox-messages.dto';
import { PublishOutboxMessagesResponseDto } from './dto/publish-outbox-messages-response.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Outbox')
@ApiInternalServerErrorResponse({
  description: 'Unexpected internal server error',
  type: ErrorResponseDto,
})
@Controller('outbox/messages')
export class OutboxController {
  constructor(
    private readonly listOutboxMessagesUseCase: ListOutboxMessagesUseCase,
    private readonly findOutboxMessageByIdUseCase: FindOutboxMessageByIdUseCase,
    private readonly publishPendingOutboxMessagesUseCase: PublishPendingOutboxMessagesUseCase,
  ) {}

  @Post('publish')
  @ApiOperation({ summary: 'Publish Outbox Messages' })
  @ApiBody({ type: PublishOutboxMessagesDto, required: false })
  @ApiCreatedResponse({
    description: 'Pending Outbox messages processed',
    type: PublishOutboxMessagesResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid publishing limit', type: ErrorResponseDto })
  publish(@Body() body: unknown): Promise<PublishPendingOutboxMessagesResult> {
    const dto = PublishOutboxMessagesDto.fromBody(body);

    return this.publishPendingOutboxMessagesUseCase.execute(dto.limit);
  }

  @Get()
  @ApiOperation({ summary: 'List Outbox messages' })
  @ApiOkResponse({
    description: 'Outbox messages returned',
    type: OutboxMessageResponseDto,
    isArray: true,
  })
  async list(): Promise<OutboxMessageResponseDto[]> {
    const outboxMessages = await this.listOutboxMessagesUseCase.execute();

    return outboxMessages.map((outboxMessage) =>
      OutboxMessageResponseDto.fromDomain(outboxMessage),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Outbox message by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Outbox message ID' })
  @ApiOkResponse({ description: 'Outbox message returned', type: OutboxMessageResponseDto })
  @ApiNotFoundResponse({ description: 'Outbox message not found', type: ErrorResponseDto })
  async findById(@Param('id') id: string): Promise<OutboxMessageResponseDto> {
    try {
      const outboxMessage = await this.findOutboxMessageByIdUseCase.execute(id);

      return OutboxMessageResponseDto.fromDomain(outboxMessage);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof OutboxMessageNotFoundError) {
      throw new NotFoundException(error.message);
    }

    throw error;
  }
}
