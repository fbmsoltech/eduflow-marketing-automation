import { Controller, Get, NotFoundException, Param, Patch } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DeadLetterMessageNotFoundError } from '../../application/dead-letter/errors';
import { FindDeadLetterMessageByIdUseCase } from '../../application/dead-letter/use-cases/find-dead-letter-message-by-id.use-case';
import { IgnoreDeadLetterMessageUseCase } from '../../application/dead-letter/use-cases/ignore-dead-letter-message.use-case';
import { ListDeadLetterMessagesUseCase } from '../../application/dead-letter/use-cases/list-dead-letter-messages.use-case';
import { DeadLetterMessageResponseDto } from './dto/dead-letter-message-response.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Dead Letter')
@ApiInternalServerErrorResponse({
  description: 'Unexpected internal server error',
  type: ErrorResponseDto,
})
@Controller('dead-letter/messages')
export class DeadLetterController {
  constructor(
    private readonly listUseCase: ListDeadLetterMessagesUseCase,
    private readonly findByIdUseCase: FindDeadLetterMessageByIdUseCase,
    private readonly ignoreUseCase: IgnoreDeadLetterMessageUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List Dead Letter messages' })
  @ApiOkResponse({
    description: 'Dead Letter messages returned',
    type: DeadLetterMessageResponseDto,
    isArray: true,
  })
  async list(): Promise<DeadLetterMessageResponseDto[]> {
    return (await this.listUseCase.execute()).map((message) =>
      DeadLetterMessageResponseDto.fromDomain(message),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Dead Letter message by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Dead Letter message ID' })
  @ApiOkResponse({
    description: 'Dead Letter message returned',
    type: DeadLetterMessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Dead Letter message not found', type: ErrorResponseDto })
  async findById(@Param('id') id: string): Promise<DeadLetterMessageResponseDto> {
    try {
      return DeadLetterMessageResponseDto.fromDomain(await this.findByIdUseCase.execute(id));
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id/ignore')
  @ApiOperation({ summary: 'Ignore Dead Letter Message' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Dead Letter message ID' })
  @ApiOkResponse({
    description: 'Dead Letter message marked as ignored',
    type: DeadLetterMessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Dead Letter message not found', type: ErrorResponseDto })
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
