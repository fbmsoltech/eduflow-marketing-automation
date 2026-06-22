export class DeadLetterMessageNotFoundError extends Error {
  constructor(id: string) {
    super(`Dead letter message not found: ${id}`);
    this.name = 'DeadLetterMessageNotFoundError';
  }
}
