import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { and, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import { cities, profiles, users } from '../../db/schema';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import type { UpdateProfileDto } from './users.dto';

export const SUPABASE_STORAGE_CLIENT = Symbol('SUPABASE_STORAGE_CLIENT');
const PHOTO_BUCKET = 'profile-photos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    @Inject(SUPABASE_STORAGE_CLIENT) private readonly storage: SupabaseClient | undefined,
    @Inject('SUPABASE_PUBLIC_URL') private readonly supabaseUrl: string | undefined,
  ) {}

  async getCurrent(user: AuthenticatedUser, language?: string) {
    const [row] = await this.database()
      .select({
        id: users.id,
        email: users.normalizedEmail,
        emailVerifiedAt: users.emailVerifiedAt,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
        bio: profiles.bio,
        cityId: profiles.cityId,
        cityName: this.cityName(language),
        interests: profiles.interests,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.id, users.id))
      .leftJoin(cities, eq(cities.id, profiles.cityId))
      .where(eq(users.id, user.id))
      .limit(1);
    if (!row) throw new NotFoundException('User profile not found.');
    const { avatarPath, ...publicFields } = row;
    return { ...publicFields, avatarUrl: this.publicAvatarUrl(avatarPath) };
  }

  async getPublic(userId: string, language?: string) {
    const [row] = await this.database()
      .select({
        id: users.id,
        status: users.accountStatus,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
        bio: profiles.bio,
        cityId: profiles.cityId,
        cityName: this.cityName(language),
        interests: profiles.interests,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.id, users.id))
      .leftJoin(cities, eq(cities.id, profiles.cityId))
      .where(and(eq(users.id, userId), eq(users.accountStatus, 'ACTIVE')))
      .limit(1);
    if (!row) throw new NotFoundException('User profile not found.');
    return {
      id: row.id,
      displayName: row.displayName,
      avatarUrl: this.publicAvatarUrl(row.avatarPath),
      bio: row.bio,
      cityId: row.cityId,
      cityName: row.cityName,
      interests: row.interests,
    };
  }

  async getCurrentAvatarPath(user: AuthenticatedUser): Promise<string | null> {
    const [row] = await this.database()
      .select({ avatarPath: profiles.avatarPath })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    return row?.avatarPath ?? null;
  }

  async updateCurrent(user: AuthenticatedUser, input: UpdateProfileDto, language?: string) {
    const db = this.database();
    const changes: Partial<typeof profiles.$inferInsert> = { updatedAt: new Date() };
    let hasChange = false;

    if (input.displayName !== undefined) {
      const displayName = [...input.displayName.trim()]
        .filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
        .join('');
      if (!displayName || displayName.length > 80) throw new BadRequestException('Display name is invalid.');
      changes.displayName = displayName;
      hasChange = true;
    }
    if (input.bio !== undefined) {
      const bio = input.bio.trim();
      if (bio.length > 500) throw new BadRequestException('Bio is too long.');
      changes.bio = bio;
      hasChange = true;
    }
    if (input.cityId !== undefined) {
      if (input.cityId !== null) {
        const [city] = await db.select({ id: cities.id }).from(cities).where(eq(cities.id, input.cityId)).limit(1);
        if (!city) throw new BadRequestException('Choose a city from the available list.');
      }
      changes.cityId = input.cityId;
      hasChange = true;
    }
    if (input.interests !== undefined) {
      const interests = [...new Set(input.interests.map((interest) => interest.trim()).filter(Boolean))];
      if (interests.length > 20 || interests.some((interest) => interest.length > 60)) {
        throw new BadRequestException('Interests are invalid.');
      }
      changes.interests = interests;
      hasChange = true;
    }
    if (input.avatarPath !== undefined) {
      if (input.avatarPath !== null) await this.validateAvatar(user.authUserId, input.avatarPath);
      changes.avatarPath = input.avatarPath;
      hasChange = true;
    }
    if (!hasChange) throw new BadRequestException('Provide at least one profile field to update.');

    await db.update(profiles).set(changes).where(eq(profiles.id, user.id));
    return this.getCurrent(user, language);
  }

  async removeUnusedAvatar(user: AuthenticatedUser, oldPath: string | null, nextPath: string | null): Promise<void> {
    if (!oldPath || oldPath === nextPath || !this.storage || !oldPath.startsWith(`${user.authUserId}/`)) return;
    await this.storage.storage.from(PHOTO_BUCKET).remove([oldPath]);
  }

  private async validateAvatar(authUserId: string, path: string): Promise<void> {
    const fileName = path.startsWith(`${authUserId}/`) ? path.slice(authUserId.length + 1) : '';
    if (!/^[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp)$/i.test(fileName)) {
      throw new BadRequestException('Choose an image uploaded to your account.');
    }
    if (!this.storage) throw new ServiceUnavailableException('Profile photo storage is not configured.');
    const { data, error } = await this.storage.storage.from(PHOTO_BUCKET).download(path);
    if (error || !data) throw new BadRequestException('Upload the profile photo again.');
    if (data.size === 0 || data.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Profile photos must be smaller than 5 MB.');
    }
    const signature = new Uint8Array(await data.slice(0, 12).arrayBuffer());
    const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
    const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => signature[index] === byte);
    const isWebp =
      signature.length >= 12 &&
      String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';
    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('Upload a valid JPEG, PNG, or WebP image.');
    }
  }

  private publicAvatarUrl(path: string | null): string | null {
    if (!path || !this.supabaseUrl) return null;
    const objectPath = path.split('/').map(encodeURIComponent).join('/');
    return `${this.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${PHOTO_BUCKET}/${objectPath}`;
  }

  private cityName(language?: string) {
    return language === 'ar' ? cities.nameAr : language === 'tr' ? cities.nameTr : cities.nameEn;
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
}
