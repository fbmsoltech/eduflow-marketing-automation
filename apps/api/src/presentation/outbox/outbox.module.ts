import { Module } from '@nestjs/common';
import { OUTBOX_MESSAGES_REPOSITORY } from '../../application/outbox/outbox-messages.repository';
import { FindOutboxMessageByIdUseCase } from '../../application/outbox/use-cases/find-outbox-message-by-id.use-case';
import { ListOutboxMessagesUseCase } from '../../application/outbox/use-cases/list-outbox-messages.use-case';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaOutboxMessagesRepository } from '../../infrastructure/prisma/repositories/prisma-outbox-messages.repository';
import { OutboxController } from './outbox.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OutboxController],
  providers: [
    ListOutboxMessagesUseCase,
    FindOutboxMessageByIdUseCase,
    {
      provide: OUTBOX_MESSAGES_REPOSITORY,
      useClass: PrismaOutboxMessagesRepository,
    },
  ],
  exports: [ListOutboxMessagesUseCase, FindOutboxMessageByIdUseCase, OUTBOX_MESSAGES_REPOSITORY],
})
export class OutboxModule {}
