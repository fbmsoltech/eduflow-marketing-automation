import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns the application status', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'eduflow-api',
    });
  });
});
