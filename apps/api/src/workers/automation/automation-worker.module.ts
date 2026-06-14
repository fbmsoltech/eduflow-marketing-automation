import { Module } from '@nestjs/common';
import { AutomationsModule } from '../../presentation/automations/automations.module';
import { AutomationMessageHandlerService } from './automation-message-handler.service';
import { AutomationWorkerService } from './automation-worker.service';

@Module({
  imports: [AutomationsModule],
  providers: [AutomationMessageHandlerService, AutomationWorkerService],
})
export class AutomationWorkerModule {}
