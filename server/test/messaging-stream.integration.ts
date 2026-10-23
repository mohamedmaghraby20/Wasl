import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { StreamChat } from 'stream-chat';
import { StreamChatAdapter } from '../src/modules/messaging/stream-chat.adapter';

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

async function connectAs(userId: string, token: string): Promise<StreamChat> {
  const client = new StreamChat(apiKey!, { allowServerSideConnect: true });
  await client.connectUser({ id: userId }, token);
  return client;
}

async function main(): Promise<void> {
  if (!apiKey || !apiSecret) {
    console.log('STREAM credentials are absent; skipping live messaging checks.');
    return;
  }

  const server = new StreamChat(apiKey, apiSecret);
  const adapter = new StreamChatAdapter({
    get: (key: string) =>
      key === 'STREAM_API_KEY' ? apiKey : key === 'STREAM_API_SECRET' ? apiSecret : undefined,
  } as unknown as ConfigService);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  const memberId = `wasl_check_member_${suffix}`;
  const moderatorId = `wasl_check_moderator_${suffix}`;
  const outsiderId = `wasl_check_outsider_${suffix}`;
  const channelId = `wasl_check_${suffix}`;
  const participants = [memberId, moderatorId, outsiderId];
  const clients: StreamChat[] = [];
  let channel: ReturnType<StreamChat['channel']> | undefined;

  try {
    const { grants } = await server.getChannelType('messaging');

    assert.equal(
      grants.user?.includes('read-channel'),
      false,
      'A plain user must not read channels they do not belong to.',
    );
    assert.equal(
      grants.user?.includes('join-channel'),
      false,
      'A plain user must not join arbitrary channels.',
    );
    assert.equal(
      grants.user?.includes('create-channel'),
      false,
      'Clients must not create messaging channels; the server provisions them.',
    );
    assert.equal(grants.channel_member?.includes('read-channel'), true);
    assert.equal(grants.channel_member?.includes('create-message'), true);
    assert.equal(grants.channel_member?.includes('delete-message'), false);
    assert.equal(grants.channel_moderator?.includes('delete-message'), true);
    assert.equal(grants.channel_moderator?.includes('ban-user'), false);
    assert.equal(grants.channel_moderator?.includes('create-channel'), false);
    assert.deepEqual(grants.anonymous, []);

    await server.upsertUsers([
      ...participants.map((id) => ({ id, name: 'Wasl live check' })),
      { id: 'wasl_system', name: 'Wasl' },
    ]);

    channel = server.channel('messaging', channelId, { created_by_id: 'wasl_system' });
    await channel.create();
    await channel.addMembers([memberId, moderatorId]);
    await channel.assignRoles([{ user_id: moderatorId, channel_role: 'channel_moderator' }]);
    await channel.sendMessage({ text: 'Member message', user_id: memberId });

    await channel.query({ state: true });
    assert.equal(channel.state.members[moderatorId]?.channel_role, 'channel_moderator');
    assert.equal(channel.state.members[memberId]?.channel_role, 'channel_member');

    const memberClient = await connectAs(memberId, adapter.token(memberId).token);
    clients.push(memberClient);
    const memberChannels = await memberClient.queryChannels({ cid: { $in: [channel.cid] } });
    assert.equal(memberChannels.length, 1, 'A member must see their channel.');
    await memberChannels[0]!.sendMessage({ text: 'Delivered in realtime' });

    const outsiderClient = await connectAs(outsiderId, server.createToken(outsiderId));
    clients.push(outsiderClient);
    const outsiderChannels = await outsiderClient
      .queryChannels({ cid: { $in: [channel.cid] } })
      .catch((error: { status?: number }) => {
        assert.equal(error.status, 403, 'Non-member channel queries must fail with an access error.');
        return [];
      });
    assert.equal(outsiderChannels.length, 0, 'A non-member must not see the channel.');
    await assert.rejects(
      outsiderClient.channel('messaging', channelId).sendMessage({ text: 'Intrusion' }),
      'A non-member must not send into the channel.',
    );

    const expiresAt = Math.floor(Date.now() / 1000) - 60;
    await assert.rejects(
      connectAs(outsiderId, server.createToken(outsiderId, expiresAt)),
      'An expired Stream token must be rejected.',
    );

    const issued = adapter.token(memberId);
    const payload = JSON.parse(
      Buffer.from(issued.token.split('.')[1]!, 'base64url').toString(),
    ) as { exp: number; iat: number; user_id: string };
    assert.equal(payload.user_id, memberId);
    assert.equal(payload.exp - payload.iat, 900);
    assert.equal(payload.exp, Math.floor(Date.parse(issued.expiresAt) / 1000));

    console.log(
      'Live Stream checks passed: members-only reads, non-member send denial, channel-scoped moderation, token expiry.',
    );
  } finally {
    for (const client of clients) {
      await client.disconnectUser().catch(() => undefined);
    }
    await channel?.delete().catch(() => undefined);
    await server
      .deleteUsers(participants, { user: 'hard', messages: 'hard' })
      .catch(() => undefined);
  }
}

void main();
