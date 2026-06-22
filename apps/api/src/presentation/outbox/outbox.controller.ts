import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { OutboxMessageNotFoundError } from '../../application/outbox/errors';
import { FindOutboxMessageByIdUseCase } from '../../application/outbox/use-cases/find-outbox-message-by-id.use-case';
import { ListOutboxMessagesUseCase } from '../../application/outbox/use-cases/list-outbox-messages.use-case';
import {
  PublishPendingOutboxMessagesResult,
  PublishPendingOutboxMessagesUseCase,
} from '../../application/outbox/use-cases/publish-pending-outbox-messages.use-case';
import { OutboxMessageResponseDto } from './dto/outbox-message-response.dto';
import { PublishOutboxMessagesDto } from './dto/publish-outbox-messages.dto';

@Controller('outbox/messages')
export class OutboxController {
  constructor(
    private readonly listOutboxMessagesUseCase: ListOutboxMessagesUseCase,
    private readonly findOutboxMessageByIdUseCase: FindOutboxMessageByIdUseCase,
    private readonly publishPendingOutboxMessagesUseCase: PublishPendingOutboxMessagesUseCase,
  ) {}

  @Post('publish')
  publish(@Body() body: unknown): Promise<PublishPendingOutboxMessagesResult> {
    const dto = PublishOutboxMessagesDto.fromBody(body);

    return this.publishPendingOutboxMessagesUseCase.execute(dto.limit);
  }

  @Get()
  async list(): Promise<OutboxMessageResponseDto[]> {
    const outboxMessages = await this.listOutboxMessagesUseCase.execute();

    return outboxMessages.map((outboxMessage) =>
      OutboxMessageResponseDto.fromDomain(outboxMessage),
    );
  }

  @Get(':id')
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
