export function providerUserId(waslUserId: string): string {
  return `wasl_${waslUserId.replaceAll('-', '')}`;
}

export function providerChannelId(conversationId: string): string {
  return `wasl_${conversationId.replaceAll('-', '')}`;
}

export function directMessagePair(userA: string, userB: string): [string, string] {
  if (userA === userB) throw new Error('Direct messages require two different users.');
  return userA < userB ? [userA, userB] : [userB, userA];
}
