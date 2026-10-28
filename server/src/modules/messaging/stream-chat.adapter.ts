import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamChat } from 'stream-chat';

const SYSTEM_USER_ID = 'wasl_system';

@Injectable()
export class StreamChatAdapter {
  private readonly client: StreamChat | undefined;
  readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('STREAM_API_KEY');
    const secret = config.get<string>('STREAM_API_SECRET');
    if (apiKey && secret && apiKey !== 'replace-me' && secret !== 'replace-me-server-only') {
      this.apiKey = apiKey;
      this.client = new StreamChat(apiKey, secret);
    }
  }

  private configured(): StreamChat {
    if (!this.client) throw new ServiceUnavailableException('Messaging is not configured.');
    return this.client;
  }

  async upsertUser(providerId: string, name: string): Promise<void> {
    await this.configured().upsertUser({ id: providerId, name });
  }

  async ensureChannel(channelId: string): Promise<void> {
    const client = this.configured();
    await client.upsertUser({ id: SYSTEM_USER_ID, name: 'Wasl' });
    await client.channel('messaging', channelId, { created_by_id: SYSTEM_USER_ID }).create();
  }

  async addMember(channelId: string, providerUserId: string): Promise<void> {
    await this.configured().channel('messaging', channelId).addMembers([providerUserId]);
  }

  async setMemberRole(
    channelId: string,
    providerUserId: string,
    moderator: boolean,
  ): Promise<void> {
    const channel = this.configured().channel('messaging', channelId);
    await channel.addMembers([providerUserId]);
    await channel.assignRoles([
      { user_id: providerUserId, channel_role: moderator ? 'channel_moderator' : 'channel_member' },
    ]);
  }

  async removeMember(channelId: string, providerUserId: string): Promise<void> {
    await this.configured().channel('messaging', channelId).removeMembers([providerUserId]);
  }

  async deactivateUser(providerUserId: string): Promise<void> {
    await this.configured().deactivateUser(providerUserId);
  }

  token(providerUserId: string): { token: string; expiresAt: string } {
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
    return {
      token: this.configured().createToken(
        providerUserId,
        expiresAt,
        Math.floor(Date.now() / 1000),
      ),
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }
}
