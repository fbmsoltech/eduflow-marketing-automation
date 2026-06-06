export class OutboxMessageNotFoundError extends Error {
  constructor(id: string) {
    super(`Outbox message not found: ${id}`);
    this.name = 'OutboxMessageNotFoundError';
  }
}
