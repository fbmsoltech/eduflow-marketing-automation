import { Module } from '@nestjs/common';
import { OUTBOX_MESSAGES_REPOSITORY } from '../../application/outbox/outbox-messages.repository';
import { FindOutboxMessageByIdUseCase } from '../../application/outbox/use-cases/find-outbox-message-by-id.use-case';
import { ListOutboxMessagesUseCase } from '../../application/outbox/use-cases/list-outbox-messages.use-case';
import { PublishPendingOutboxMessagesUseCase } from '../../application/outbox/use-cases/publish-pending-outbox-messages.use-case';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaOutboxMessagesRepository } from '../../infrastructure/prisma/repositories/prisma-outbox-messages.repository';
import { OutboxController } from './outbox.controller';

@Module({
  imports: [PrismaModule, MessagingModule],
  controllers: [OutboxController],
  providers: [
    ListOutboxMessagesUseCase,
    FindOutboxMessageByIdUseCase,
    PublishPendingOutboxMessagesUseCase,
    {
      provide: OUTBOX_MESSAGES_REPOSITORY,
      useClass: PrismaOutboxMessagesRepository,
    },
  ],
  exports: [
    ListOutboxMessagesUseCase,
    FindOutboxMessageByIdUseCase,
    PublishPendingOutboxMessagesUseCase,
    OUTBOX_MESSAGES_REPOSITORY,
  ],
})
export class OutboxModule {}
