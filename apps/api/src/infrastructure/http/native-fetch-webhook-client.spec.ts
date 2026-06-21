import { NativeFetchWebhookClient } from './native-fetch-webhook-client';

describe('NativeFetchWebhookClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends JSON using native fetch and returns the HTTP status', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 202,
    } as Response);
    const client = new NativeFetchWebhookClient();

    await expect(
      client.send({
        url: 'https://example.com/hooks',
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        payload: { source: 'eduflow' },
        timeoutMs: 100,
      }),
    ).resolves.toEqual({ statusCode: 202 });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/hooks',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer token',
        },
        body: JSON.stringify({ source: 'eduflow' }),
      }),
    );
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts requests after the configured timeout', async () => {
    jest.useFakeTimers();
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Request timed out', 'AbortError')),
          );
        }),
    );
    const client = new NativeFetchWebhookClient();
    const request = client.send({
      url: 'https://example.com/hooks',
      method: 'POST',
      headers: {},
      payload: {},
      timeoutMs: 10,
    });
    const expectation = expect(request).rejects.toMatchObject({ name: 'AbortError' });

    await jest.advanceTimersByTimeAsync(10);
    await expectation;
    jest.useRealTimers();
  });
});
