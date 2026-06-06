import { Module } from '@nestjs/common';
import { MESSAGE_BROKER } from '../../application/messaging/message-broker';
import { RabbitMQMessageBroker } from './rabbitmq-message-broker';

@Module({
  providers: [
    {
      provide: MESSAGE_BROKER,
      useClass: RabbitMQMessageBroker,
    },
  ],
  exports: [MESSAGE_BROKER],
})
export class MessagingModule {}
