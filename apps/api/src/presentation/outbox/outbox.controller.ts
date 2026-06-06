import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { OutboxMessageNotFoundError } from '../../application/outbox/errors';
import { FindOutboxMessageByIdUseCase } from '../../application/outbox/use-cases/find-outbox-message-by-id.use-case';
import { ListOutboxMessagesUseCase } from '../../application/outbox/use-cases/list-outbox-messages.use-case';
import { OutboxMessageResponseDto } from './dto/outbox-message-response.dto';

@Controller('outbox/messages')
export class OutboxController {
  constructor(
    private readonly listOutboxMessagesUseCase: ListOutboxMessagesUseCase,
    private readonly findOutboxMessageByIdUseCase: FindOutboxMessageByIdUseCase,
  ) {}

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
