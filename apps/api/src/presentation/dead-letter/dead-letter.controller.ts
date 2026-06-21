import { Controller, Get, NotFoundException, Param, Patch } from '@nestjs/common';
import { DeadLetterMessageNotFoundError } from '../../application/dead-letter/errors';
import { FindDeadLetterMessageByIdUseCase } from '../../application/dead-letter/use-cases/find-dead-letter-message-by-id.use-case';
import { IgnoreDeadLetterMessageUseCase } from '../../application/dead-letter/use-cases/ignore-dead-letter-message.use-case';
import { ListDeadLetterMessagesUseCase } from '../../application/dead-letter/use-cases/list-dead-letter-messages.use-case';
import { DeadLetterMessageResponseDto } from './dto/dead-letter-message-response.dto';

@Controller('dead-letter/messages')
export class DeadLetterController {
  constructor(
    private readonly listUseCase: ListDeadLetterMessagesUseCase,
    private readonly findByIdUseCase: FindDeadLetterMessageByIdUseCase,
    private readonly ignoreUseCase: IgnoreDeadLetterMessageUseCase,
  ) {}

  @Get()
  async list(): Promise<DeadLetterMessageResponseDto[]> {
    return (await this.listUseCase.execute()).map((message) =>
      DeadLetterMessageResponseDto.fromDomain(message),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<DeadLetterMessageResponseDto> {
    try {
      return DeadLetterMessageResponseDto.fromDomain(await this.findByIdUseCase.execute(id));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id/ignore')
  async ignore(@Param('id') id: string): Promise<DeadLetterMessageResponseDto> {
    try {
      return DeadLetterMessageResponseDto.fromDomain(await this.ignoreUseCase.execute(id));
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof DeadLetterMessageNotFoundError) {
      throw new NotFoundException(error.message);
    }
    throw error;
  }
}
