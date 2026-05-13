import { Module } from '@nestjs/common';
import { HealthModule } from './presentation/health/health.module';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
