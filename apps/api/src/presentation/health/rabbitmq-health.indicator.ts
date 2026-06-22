import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { connect } from 'amqplib';

const DEFAULT_RABBITMQ_URL = 'amqp://eduflow:eduflow@localhost:5672';

@Injectable()
export class RabbitMQHealthIndicator {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  async isHealthy(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('rabbitmq');

    try {
      const connection = await connect(process.env['RABBITMQ_URL']?.trim() || DEFAULT_RABBITMQ_URL);
      await connection.close();
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'RabbitMQ connection failed',
      });
    }
  }
}
