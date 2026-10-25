import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResendEmailAdapter {
  constructor(private readonly config: ConfigService) {}

  async send(input: { id: string; to: string; subject: string; text: string }): Promise<string> {
    const key = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('RESEND_FROM_EMAIL');
    if (!key || !from) throw new ServiceUnavailableException('Email delivery is not configured.');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.id,
      },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new ServiceUnavailableException('Email provider rejected delivery.');
    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== 'object' ||
      !('id' in result) ||
      typeof result.id !== 'string'
    ) {
      throw new ServiceUnavailableException('Email provider did not return a delivery ID.');
    }
    return result.id;
  }
}
