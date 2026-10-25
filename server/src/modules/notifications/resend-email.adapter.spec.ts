/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResendEmailAdapter } from './resend-email.adapter';

const input = {
  id: 'delivery-id',
  to: 'user@example.test',
  subject: 'Update',
  text: 'View your update.',
};

describe('ResendEmailAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('never sends without server credentials', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new ResendEmailAdapter({ get: () => undefined } as unknown as ConfigService);
    await expect(adapter.send(input)).rejects.toThrow('Email delivery is not configured.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends plain text with an idempotency key and returns the provider ID', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'provider-id' }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new ResendEmailAdapter({
      get: (name: string) => (name === 'RESEND_API_KEY' ? 'secret-key' : 'no-reply@example.test'),
    } as unknown as ConfigService);
    await expect(adapter.send(input)).resolves.toBe('provider-id');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-key',
          'Idempotency-Key': 'delivery-id',
        }),
        body: JSON.stringify({
          from: 'no-reply@example.test',
          to: input.to,
          subject: input.subject,
          text: input.text,
        }),
      }),
    );
  });

  it('does not expose provider response details on a failed send', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    const adapter = new ResendEmailAdapter({
      get: (name: string) => (name === 'RESEND_API_KEY' ? 'secret-key' : 'no-reply@example.test'),
    } as unknown as ConfigService);
    await expect(adapter.send(input)).rejects.toThrow('Email provider rejected delivery.');
  });

  it('recovers after a provider outage without changing the delivery idempotency key', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('simulated network outage'))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'provider-id' }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new ResendEmailAdapter({
      get: (name: string) => (name === 'RESEND_API_KEY' ? 'secret-key' : 'no-reply@example.test'),
    } as unknown as ConfigService);
    await expect(adapter.send(input)).rejects.toThrow('simulated network outage');
    await expect(adapter.send(input)).resolves.toBe('provider-id');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls as Array<[string, RequestInit]>) {
      expect(new Headers(options.headers).get('Idempotency-Key')).toBe(input.id);
    }
  });
});
