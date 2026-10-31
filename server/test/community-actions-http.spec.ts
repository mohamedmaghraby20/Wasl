import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { API_PREFIX } from '../src/config/api';
import { corsOptions } from '../src/config/cors';
import { sampleOwnerId } from '../src/db/development-seed-data';
import { SupabaseAuthGuard } from '../src/modules/auth/supabase-auth.guard';
import { CommunitiesController } from '../src/modules/communities/communities.controller';
import { CommunityDeletionService } from '../src/modules/communities/community-deletion.service';
import { CommunitiesService } from '../src/modules/communities/communities.service';
import { EventsController } from '../src/modules/events/events.controller';
import { EventsService } from '../src/modules/events/events.service';
import { ModeratorAssignmentsController } from '../src/modules/moderation/moderation.controller';
import { ModerationService } from '../src/modules/moderation/moderation.service';
import { ParticipationController } from '../src/modules/participation/participation.controller';
import { ParticipationService } from '../src/modules/participation/participation.service';

describe('community and event action HTTP contracts', () => {
  let app: NestFastifyApplication;
  const moderation = {
    permissions: vi.fn().mockResolvedValue({ manager: true, moderator: false }),
    listModerators: vi.fn().mockResolvedValue([]),
    assignModerator: vi.fn().mockResolvedValue({ userId: sampleOwnerId }),
    removeModerator: vi.fn().mockResolvedValue({ userId: sampleOwnerId }),
  };
  const communities = {
    update: vi.fn().mockResolvedValue({}),
    archive: vi.fn().mockResolvedValue({}),
  };
  const events = { update: vi.fn().mockResolvedValue({}), cancel: vi.fn().mockResolvedValue({}) };
  const participation = {
    decideCommunity: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
    decideEvent: vi.fn().mockResolvedValue({ status: 'ACCEPTED' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        CommunitiesController,
        EventsController,
        ModeratorAssignmentsController,
        ParticipationController,
      ],
      providers: [
        { provide: CommunitiesService, useValue: communities },
        { provide: CommunityDeletionService, useValue: {} },
        { provide: EventsService, useValue: events },
        { provide: ModerationService, useValue: moderation },
        { provide: ParticipationService, useValue: participation },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({
        canActivate(context: { switchToHttp(): { getRequest(): { user?: unknown } } }) {
          context.switchToHttp().getRequest().user = { id: sampleOwnerId, authUserId: '' };
          return true;
        },
      })
      .compile();
    // Vitest does not emit constructor metadata; use the same service stubs explicitly.
    Object.assign(module.get(CommunitiesController), { communities });
    Object.assign(module.get(EventsController), { events });
    Object.assign(module.get(ModeratorAssignmentsController), { moderation });
    Object.assign(module.get(ParticipationController), { participation });
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix(API_PREFIX);
    app.enableCors(corsOptions);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(['PATCH', 'PUT', 'DELETE'])('allows browser preflight for %s', async (method) => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: `/${API_PREFIX}/communities/dev-seed-community-07`,
      headers: {
        origin: corsOptions.origin,
        'access-control-request-method': method,
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain(method);
    expect(response.headers['access-control-allow-origin']).toBe(corsOptions.origin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it.each(['community', 'event'])(
    'accepts seeded %s IDs for all moderator routes',
    async (kind) => {
      const id = `dev-seed-${kind}-07`;
      const base = `/${API_PREFIX}/moderation/${kind}/${id}`;
      expect((await app.inject({ method: 'GET', url: `${base}/permissions` })).statusCode).toBe(
        200,
      );
      expect(moderation.permissions).toHaveBeenCalledWith(sampleOwnerId, kind, id);
      expect((await app.inject({ method: 'GET', url: `${base}/moderators` })).statusCode).toBe(200);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/moderators`,
            payload: { userId: sampleOwnerId },
          })
        ).statusCode,
      ).toBe(201);
      expect(
        (await app.inject({ method: 'DELETE', url: `${base}/moderators/${sampleOwnerId}` }))
          .statusCode,
      ).toBe(200);
      expect(
        (await app.inject({ method: 'DELETE', url: `${base}/moderators/not-a-uuid` })).statusCode,
      ).toBe(400);
    },
  );

  it.each(['approve', 'reject', 'promote', 'remove'])(
    'routes seeded community %s decisions',
    async (action) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/${API_PREFIX}/communities/dev-seed-community-07/participants/${sampleOwnerId}/${action}`,
      });
      expect(response.statusCode).toBe(200);
      expect(participation.decideCommunity).toHaveBeenCalledWith(
        expect.objectContaining({ id: sampleOwnerId }),
        'dev-seed-community-07',
        sampleOwnerId,
        action,
      );
    },
  );

  it.each([
    ['communities', 'dev-seed-community-07', 'archive'],
    ['events', 'dev-seed-event-07', 'cancel'],
  ])(
    'accepts text resource IDs for %s update and lifecycle actions',
    async (resource, id, action) => {
      expect(
        (await app.inject({ method: 'PUT', url: `/${API_PREFIX}/${resource}/${id}`, payload: {} }))
          .statusCode,
      ).toBe(200);
      expect(
        (await app.inject({ method: 'PATCH', url: `/${API_PREFIX}/${resource}/${id}/${action}` }))
          .statusCode,
      ).toBe(200);
    },
  );

  it('retains participant UUID and action validation', async () => {
    for (const suffix of ['not-a-uuid/approve', `${sampleOwnerId}/invalid`]) {
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: `/${API_PREFIX}/communities/dev-seed-community-07/participants/${suffix}`,
          })
        ).statusCode,
      ).toBe(400);
    }
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/${API_PREFIX}/moderation/invalid/dev-seed-community-07/permissions`,
        })
      ).statusCode,
    ).toBe(400);
  });
});
