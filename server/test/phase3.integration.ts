import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { API_PREFIX } from '../src/config/api';

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
if (!supabaseUrl || !publishableKey || !secretKey || !databaseUrl) {
  throw new Error(
    'Configured Supabase URL, API keys, and DATABASE_URL are required for Phase 3 integration checks.',
  );
}

const testId = randomUUID().replaceAll('-', '');
const testEmail = `phase3-audit-${testId}@example.test`;
const displayName = `Phase 3 Audit ${testId.slice(0, 8)}`;
const password = `W${randomBytes(24).toString('base64url')}!9a`;
const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const authClient = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const cleanupPool = new Pool({ connectionString: databaseUrl, max: 1 });
const communityIds: string[] = [];
const eventIds: string[] = [];
let authUserId: string | undefined;
let waslUserId: string | undefined;
let uploadedPhotoPath: string | undefined;
let apiProcess: ChildProcess | undefined;

async function startApi(): Promise<string> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );

  apiProcess = spawn(process.execPath, ['dist/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (apiProcess.exitCode !== null)
      throw new Error('Built Nest API exited before becoming ready.');
    try {
      const health = await fetch(`${baseUrl}/${API_PREFIX}/health`);
      if (health.ok) return baseUrl;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Built Nest API did not become ready within 30 seconds.');
}

async function stopApi(): Promise<void> {
  if (!apiProcess || apiProcess.exitCode !== null) return;
  const processToStop = apiProcess;
  const exited = new Promise<void>((resolve) => processToStop.once('exit', () => resolve()));
  processToStop.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
  if (processToStop.exitCode === null) processToStop.kill('SIGKILL');
}

async function jsonRequest<T>(
  baseUrl: string,
  path: string,
  token: string | undefined,
  method = 'GET',
  body?: unknown,
): Promise<{ status: number; data: T | undefined }> {
  const response = await fetch(`${baseUrl}/${API_PREFIX}/${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.headers.get('content-type')?.includes('application/json')
    ? ((await response.json()) as T)
    : undefined;
  return { status: response.status, data };
}

function request<T>(baseUrl: string, token: string, path: string, method = 'GET', body?: unknown) {
  return jsonRequest<T>(baseUrl, path, token, method, body);
}

async function expectStatus<T>(
  result: Promise<{ status: number; data: T | undefined }>,
  expected: number,
  label: string,
): Promise<T | undefined> {
  const response = await result;
  assert.equal(
    response.status,
    expected,
    `${label} should return HTTP ${expected}; got ${JSON.stringify(response.data)}.`,
  );
  return response.data;
}

async function main(): Promise<void> {
  try {
    const created = await admin.auth.admin.createUser({
      email: testEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (created.error || !created.data.user)
      throw new Error('Could not create the temporary Supabase Auth user.');
    authUserId = created.data.user.id;

    const signedIn = await authClient.auth.signInWithPassword({ email: testEmail, password });
    if (signedIn.error || !signedIn.data.session)
      throw new Error('The temporary Supabase Auth user could not sign in.');
    const token = signedIn.data.session.access_token;
    const verified = await authClient.auth.getUser(token);
    assert.equal(
      verified.data.user?.id,
      authUserId,
      'The access token should resolve to its Supabase Auth identity.',
    );
    const baseUrl = await startApi();

    await expectStatus(
      jsonRequest(baseUrl, 'users/me', undefined),
      401,
      'Anonymous current-user request',
    );
    await expectStatus(
      jsonRequest(baseUrl, 'users/me', 'forged-phase3-token'),
      401,
      'Forged current-user token',
    );
    const current = await expectStatus<{
      id: string;
      email: string;
      displayName: string;
      avatarUrl: string | null;
    }>(request(baseUrl, token, 'users/me?lang=en'), 200, 'Authenticated current-user request');
    assert.ok(current);
    waslUserId = current.id;
    assert.notEqual(
      current.id,
      authUserId,
      'Wasl identity should be distinct from the Supabase Auth ID.',
    );
    assert.equal(current.displayName, displayName);
    assert.equal(current.email, testEmail);

    const publicProfile = await expectStatus<Record<string, unknown>>(
      jsonRequest(baseUrl, `users/${current.id}?lang=en`, undefined),
      200,
      'Public profile request',
    );
    assert.ok(publicProfile);
    assert.equal(publicProfile.displayName, displayName);
    assert.equal('email' in publicProfile, false, 'Public profiles must not expose email.');
    assert.equal(
      'accountStatus' in publicProfile,
      false,
      'Public profiles must not expose account status.',
    );

    const cities = await expectStatus<Array<{ id: string }>>(
      jsonRequest(baseUrl, 'reference/cities', undefined),
      200,
      'Public city list',
    );
    const categories = await expectStatus<Array<{ id: string }>>(
      jsonRequest(baseUrl, 'reference/categories', undefined),
      200,
      'Public category list',
    );
    assert.ok(cities?.[0]?.id);
    assert.ok(categories?.[0]?.id);

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p0sAAAAASUVORK5CYII=',
      'base64',
    );
    uploadedPhotoPath = `${authUserId}/${randomUUID()}.png`;
    const upload = await authClient.storage.from('profile-photos').upload(uploadedPhotoPath, png, {
      contentType: 'image/png',
      upsert: false,
    });
    if (upload.error) throw new Error('The authenticated user could not upload a profile photo.');
    const photoProfile = await expectStatus<{ avatarUrl: string | null }>(
      request(baseUrl, token, 'users/me?lang=en', 'PATCH', {
        displayName,
        bio: 'Temporary Phase 3 integration check.',
        cityId: cities[0].id,
        interests: ['integration'],
        avatarPath: uploadedPhotoPath,
      }),
      200,
      'Profile update with a verified image',
    );
    assert.ok(photoProfile?.avatarUrl?.includes(`${authUserId}/`));

    const cityId = cities[0].id;
    const categoryId = categories[0].id;
    const communityName = `Phase3 Audit ${testId}`;
    const community = await expectStatus<{ id: string; slug: string }>(
      request(baseUrl, token, 'communities', 'POST', {
        name: communityName,
        description: 'Temporary Phase 3 integration fixture.',
        cityId,
        categoryIds: [categoryId],
        admissionMode: 'open',
        capacity: null,
      }),
      201,
      'Community creation',
    );
    assert.ok(community);
    communityIds.push(community.id);
    const communityDetails = await expectStatus<{
      name: string;
      categories: Array<{ id: string }>;
    }>(
      jsonRequest(baseUrl, `communities/${community.slug}`, undefined),
      200,
      'Public community details',
    );
    assert.equal(communityDetails?.name, communityName);
    assert.equal(communityDetails?.categories[0]?.id, categoryId);

    const renamedCommunity = `${communityName} Updated`;
    await expectStatus(
      request(baseUrl, token, `communities/${community.id}`, 'PUT', {
        name: renamedCommunity,
        description: 'Updated Phase 3 integration fixture.',
        cityId,
        categoryIds: [categoryId],
        admissionMode: 'approval',
        capacity: 12,
      }),
      200,
      'Community update',
    );
    const updatedCommunity = await expectStatus<{ name: string; admissionMode: string }>(
      jsonRequest(baseUrl, `communities/${community.slug}`, undefined),
      200,
      'Updated public community details',
    );
    assert.equal(updatedCommunity?.name, renamedCommunity);
    assert.equal(updatedCommunity?.admissionMode, 'approval');

    const eventTitle = `Phase3 Audit ${testId}`;
    const eventBody = {
      title: eventTitle,
      description: 'Temporary Phase 3 integration fixture.',
      visibility: 'unlisted',
      categoryIds: [categoryId],
      startsAt: '2099-11-10T17:00:00.000Z',
      online: true,
      admissionMode: 'instant',
      capacity: null,
    };
    const event = await expectStatus<{ id: string; slug: string }>(
      request(baseUrl, token, 'events', 'POST', eventBody),
      201,
      'Independent unlisted event creation',
    );
    assert.ok(event);
    eventIds.push(event.id);
    const eventDetails = await expectStatus<{ title: string; visibility: string; hostId: string }>(
      jsonRequest(baseUrl, `events/${event.slug}`, undefined),
      200,
      'Direct unlisted event details',
    );
    assert.equal(eventDetails?.title, eventTitle);
    assert.equal(eventDetails?.visibility, 'unlisted');
    assert.equal(eventDetails?.hostId, current.id);
    const eventList = await expectStatus<{ items: Array<{ id: string }> }>(
      jsonRequest(baseUrl, `events?q=${encodeURIComponent(eventTitle)}`, undefined),
      200,
      'Public event list',
    );
    assert.equal(
      eventList?.items.some((item) => item.id === event.id),
      false,
      'Unlisted events must stay out of discovery.',
    );

    await expectStatus(
      request(baseUrl, token, `events/${event.id}`, 'PUT', {
        ...eventBody,
        title: `${eventTitle} Updated`,
        visibility: 'public',
        communityId: null,
      }),
      200,
      'Event update',
    );
    const cancelled = await expectStatus<{ id: string }>(
      request(baseUrl, token, `events/${event.id}/cancel`, 'PATCH'),
      200,
      'Event cancellation',
    );
    assert.equal(cancelled?.id, event.id);
    await expectStatus(
      request(baseUrl, token, `events/${event.id}/cancel`, 'PATCH'),
      200,
      'Repeated event cancellation',
    );
    const cancelledDetails = await expectStatus<{ cancelled: boolean }>(
      jsonRequest(baseUrl, `events/${event.slug}`, undefined),
      200,
      'Cancelled event details',
    );
    assert.equal(cancelledDetails?.cancelled, true);

    const hostedEvent = await expectStatus<{ id: string }>(
      request(baseUrl, token, 'events', 'POST', {
        ...eventBody,
        title: `${eventTitle} Community Hosted`,
        communityId: community.id,
      }),
      201,
      'Community-hosted event creation',
    );
    assert.ok(hostedEvent);
    eventIds.push(hostedEvent.id);
    const hostedDetails = await expectStatus<{
      hostType: string;
      hostId: string;
      cityId: string | null;
    }>(
      jsonRequest(baseUrl, `events/${hostedEvent.id}`, undefined),
      200,
      'Community-hosted public event details',
    );
    assert.equal(hostedDetails?.hostType, 'community');
    assert.equal(hostedDetails?.hostId, community.id);
    assert.equal(hostedDetails?.cityId, null);

    await expectStatus(
      request(baseUrl, token, `communities/${community.id}/archive`, 'PATCH'),
      200,
      'Community archive',
    );
    await expectStatus(
      jsonRequest(baseUrl, `communities/${community.slug}`, undefined),
      404,
      'Archived community detail visibility',
    );

    const noAvatar = await expectStatus<{ avatarUrl: string | null }>(
      request(baseUrl, token, 'users/me?lang=en', 'PATCH', { avatarPath: null }),
      200,
      'Profile photo removal',
    );
    assert.equal(noAvatar?.avatarUrl, null);

    console.log(
      'Phase 3 Supabase Auth, profile, Storage, and resource API integration checks passed.',
    );
  } finally {
    try {
      await stopApi();
    } finally {
      const cleanupFailures: string[] = [];
      const attemptCleanup = async (
        label: string,
        operation: () => Promise<unknown>,
      ): Promise<void> => {
        try {
          await operation();
        } catch {
          cleanupFailures.push(label);
        }
      };
      if (eventIds.length) {
        await attemptCleanup('created event IDs', () =>
          cleanupPool.query('delete from public.events where id = any($1::text[])', [eventIds]),
        );
      }
      if (communityIds.length) {
        await attemptCleanup('created community IDs', () =>
          cleanupPool.query('delete from public.communities where id = any($1::text[])', [
            communityIds,
          ]),
        );
      }
      await attemptCleanup('unique test events', () =>
        cleanupPool.query('delete from public.events where slug like $1', [
          `phase3-audit-${testId}-%`,
        ]),
      );
      await attemptCleanup('unique test communities', () =>
        cleanupPool.query('delete from public.communities where slug like $1', [
          `phase3-audit-${testId}-%`,
        ]),
      );
      if (authUserId) {
        let mappedUserId = waslUserId;
        await attemptCleanup('temporary identity mapping', async () => {
          const result = await cleanupPool.query<{ user_id: string }>(
            'delete from identity.auth_identities where provider_user_id = $1 returning user_id',
            [authUserId],
          );
          mappedUserId ??= result.rows[0]?.user_id;
        });
        if (mappedUserId) {
          await attemptCleanup('temporary Wasl user', () =>
            cleanupPool.query('delete from identity.users where id = $1', [mappedUserId]),
          );
        }
        if (uploadedPhotoPath) {
          await attemptCleanup('temporary profile photo', async () => {
            const result = await admin.storage.from('profile-photos').remove([uploadedPhotoPath!]);
            if (result.error) throw result.error;
          });
        }
        await attemptCleanup('temporary Supabase Auth user', async () => {
          const result = await admin.auth.admin.deleteUser(authUserId!);
          if (result.error) throw result.error;
        });
      }
      await attemptCleanup('database pool', () => cleanupPool.end());
      if (cleanupFailures.length) {
        console.error(`Phase 3 integration cleanup failed: ${cleanupFailures.join(', ')}.`);
        process.exitCode = 1;
      }
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Phase 3 integration checks failed.');
  process.exitCode = 1;
});
