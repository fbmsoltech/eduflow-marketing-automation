import { Module } from '@nestjs/common';
import { DEAD_LETTER_MESSAGES_REPOSITORY } from '../../application/dead-letter/dead-letter-messages.repository';
import { CreateDeadLetterMessageUseCase } from '../../application/dead-letter/use-cases/create-dead-letter-message.use-case';
import { FindDeadLetterMessageByIdUseCase } from '../../application/dead-letter/use-cases/find-dead-letter-message-by-id.use-case';
import { IgnoreDeadLetterMessageUseCase } from '../../application/dead-letter/use-cases/ignore-dead-letter-message.use-case';
import { ListDeadLetterMessagesUseCase } from '../../application/dead-letter/use-cases/list-dead-letter-messages.use-case';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaDeadLetterMessagesRepository } from '../../infrastructure/prisma/repositories/prisma-dead-letter-messages.repository';
import { DeadLetterController } from './dead-letter.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DeadLetterController],
  providers: [
    CreateDeadLetterMessageUseCase,
    FindDeadLetterMessageByIdUseCase,
    IgnoreDeadLetterMessageUseCase,
    ListDeadLetterMessagesUseCase,
    {
      provide: DEAD_LETTER_MESSAGES_REPOSITORY,
      useClass: PrismaDeadLetterMessagesRepository,
    },
  ],
  exports: [CreateDeadLetterMessageUseCase, DEAD_LETTER_MESSAGES_REPOSITORY],
})
export class DeadLetterModule {}
