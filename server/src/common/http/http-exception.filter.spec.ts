import { BadRequestException, ServiceUnavailableException, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter';

function responseFor(exception: unknown): Record<string, unknown> {
  const send = vi.fn();
  const response = { status: vi.fn().mockReturnValue({ send }) };
  const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ url: '/invite/secret?token=secret' }) }) } as unknown as ArgumentsHost;
  new HttpExceptionFilter().catch(exception, host);
  return send.mock.calls[0]![0] as Record<string, unknown>;
}

describe('HttpExceptionFilter', () => {
  it('does not expose internal errors, request URLs, or exception names', () => {
    const response = responseFor(new ServiceUnavailableException('Database password: secret'));
    expect(JSON.stringify(response)).not.toMatch(/secret|database|ServiceUnavailableException/i);
    expect(response.message).toBe('Something went wrong. Please try again later.');
  });

  it('does not echo untrusted validation details', () => {
    const response = responseFor(new BadRequestException(['Invalid secret input']));
    expect(JSON.stringify(response)).not.toContain('secret');
    expect(response.message).toBe('Please check your information and try again.');
  });

  it('preserves the capacity feedback used by the organizer screen', () => {
    expect(responseFor(new BadRequestException('No event capacity is currently available.')).message)
      .toBe('No event capacity is currently available.');
  });
});
