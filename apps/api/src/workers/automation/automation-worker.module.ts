import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability/observability.module';
import { AutomationsModule } from '../../presentation/automations/automations.module';
import { AutomationMessageHandlerService } from './automation-message-handler.service';
import { AutomationWorkerService } from './automation-worker.service';

@Module({
  imports: [ObservabilityModule, AutomationsModule],
  providers: [AutomationMessageHandlerService, AutomationWorkerService],
})
export class AutomationWorkerModule {}
