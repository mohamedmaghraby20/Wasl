import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { Pool } from 'pg';
import { and, eq, sql } from 'drizzle-orm';
import {
  authIdentities,
  categories,
  cities,
  communities,
  legalDocuments,
  profiles,
  retentionPolicies,
  users,
} from './schema';
import * as schema from './schema';
import { seedDevelopmentData } from './development-seed';
import { sampleOwnerId } from './development-seed-data';

const provinceNames = [
  'Adana|أضنة',
  'Adıyaman|أديامان',
  'Afyonkarahisar|أفيون قره حصار',
  'Ağrı|أغري',
  'Aksaray|أق سراي',
  'Amasya|أماصيا',
  'Ankara|أنقرة',
  'Antalya|أنطاليا',
  'Ardahan|أردهان',
  'Artvin|أرتوين',
  'Aydın|آيدن',
  'Balıkesir|باليكسير',
  'Bartın|بارتين',
  'Batman|باتمان',
  'Bayburt|بايبورت',
  'Bilecik|بيليجيك',
  'Bingöl|بينغول',
  'Bitlis|بدليس',
  'Bolu|بولو',
  'Burdur|بوردور',
  'Bursa|بورصة',
  'Çanakkale|جناق قلعة',
  'Çankırı|جنقري',
  'Çorum|جوروم',
  'Denizli|دنيزلي',
  'Diyarbakır|دياربكر',
  'Düzce|دوزجه',
  'Edirne|أدرنة',
  'Elazığ|إلازيغ',
  'Erzincan|أرزنجان',
  'Erzurum|أرضروم',
  'Eskişehir|إسكي شهير',
  'Gaziantep|غازي عنتاب',
  'Giresun|غيرسون',
  'Gümüşhane|غوموش خانة',
  'Hakkari|هاكاري',
  'Hatay|هاتاي',
  'Iğdır|إغدير',
  'Isparta|إسبرطة',
  'İstanbul|إسطنبول',
  'İzmir|إزمير',
  'Kahramanmaraş|كهرمان مرعش',
  'Karabük|قره بوك',
  'Karaman|قره مان',
  'Kars|قارص',
  'Kastamonu|قسطموني',
  'Kayseri|قيصري',
  'Kilis|كيليس',
  'Kırıkkale|قرق قلعة',
  'Kırklareli|قرقلار إيلي',
  'Kırşehir|قرشهير',
  'Kocaeli|كوجالي',
  'Konya|قونية',
  'Kütahya|كوتاهية',
  'Malatya|ملاطية',
  'Manisa|مانيسا',
  'Mardin|ماردين',
  'Mersin|مرسين',
  'Muğla|موغلا',
  'Muş|موش',
  'Nevşehir|نوشهر',
  'Niğde|نيغدة',
  'Ordu|أوردو',
  'Osmaniye|عثمانية',
  'Rize|ريزه',
  'Sakarya|سكاريا',
  'Samsun|سامسون',
  'Şanlıurfa|شانلي أورفا',
  'Siirt|سعرد',
  'Sinop|سينوب',
  'Sivas|سيواس',
  'Şırnak|شرناق',
  'Tekirdağ|تكيرداغ',
  'Tokat|توقات',
  'Trabzon|طرابزون',
  'Tunceli|تونجلي',
  'Uşak|أوشاك',
  'Van|وان',
  'Yalova|يالوفا',
  'Yozgat|يوزغات',
  'Zonguldak|زونغولداك',
].map((entry) => {
  const [nameTr, nameAr] = entry.split('|');
  const id = nameTr!
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll(' ', '-');
  return {
    id,
    nameTr: nameTr!,
    nameAr: nameAr!,
    nameEn: nameTr!.replace('İ', 'I').replace('ı', 'i'),
  };
});

const categorySeed = [
  { id: 'social', nameTr: 'Sosyal ve Topluluk', nameAr: 'اجتماعي ومجتمعي', nameEn: 'Social & Community' },
  { id: 'technology', nameTr: 'Teknoloji', nameAr: 'تقنية', nameEn: 'Technology' },
  { id: 'business', nameTr: 'Kariyer ve İş', nameAr: 'مسار مهني وأعمال', nameEn: 'Career & Business' },
  { id: 'arts', nameTr: 'Sanat ve Tasarım', nameAr: 'فنون وتصميم', nameEn: 'Arts & Design' },
  { id: 'culture', nameTr: 'Kültür ve Miras', nameAr: 'ثقافة وتراث', nameEn: 'Culture & Heritage' },
  { id: 'music', nameTr: 'Müzik', nameAr: 'موسيقى', nameEn: 'Music' },
  { id: 'sports', nameTr: 'Spor ve Fitness', nameAr: 'رياضة ولياقة', nameEn: 'Sports & Fitness' },
  { id: 'health', nameTr: 'Sağlık ve İyi Yaşam', nameAr: 'صحة وعافية', nameEn: 'Health & Wellness' },
  { id: 'food', nameTr: 'Yemek ve İçecek', nameAr: 'طعام وشراب', nameEn: 'Food & Drink' },
  { id: 'travel', nameTr: 'Seyahat ve Doğa', nameAr: 'سفر وطبيعة', nameEn: 'Travel & Outdoors' },
  { id: 'education', nameTr: 'Eğitim', nameAr: 'تعليم', nameEn: 'Education' },
  { id: 'gaming', nameTr: 'Oyunlar', nameAr: 'ألعاب', nameEn: 'Games' },
  { id: 'film', nameTr: 'Film ve Medya', nameAr: 'أفلام وإعلام', nameEn: 'Film & Media' },
  { id: 'books', nameTr: 'Kitap ve Edebiyat', nameAr: 'كتب وأدب', nameEn: 'Books & Literature' },
  { id: 'language', nameTr: 'Dil ve Kültür', nameAr: 'لغة وثقافة', nameEn: 'Language & Culture' },
  { id: 'family', nameTr: 'Ebeveyn ve Aile', nameAr: 'آباء وعائلة', nameEn: 'Parents & Family' },
  { id: 'volunteering', nameTr: 'Gönüllülük ve Yardım', nameAr: 'تطوع وقضايا', nameEn: 'Volunteering & Causes' },
  { id: 'environment', nameTr: 'Çevre', nameAr: 'بيئة', nameEn: 'Environment' },
  { id: 'photography', nameTr: 'Fotoğrafçılık', nameAr: 'تصوير', nameEn: 'Photography' },
];

// Empty versioned policy slots required by docs/launch-decisions.md. Content stays null and the
// status stays DRAFT until counsel supplies approved text; nothing here is published.
const legalDocumentSlots = [
  ...['TERMS_OF_USE', 'PRIVACY_NOTICE', 'AGE_ELIGIBILITY_POLICY', 'COOKIE_NOTICE'].flatMap((type) =>
    ['ar', 'en', 'tr'].map((locale) => ({ type, locale })),
  ),
  ...['TAKEDOWN_PROCEDURE', 'PROCESSOR_TRANSFER_REGISTER', 'RETENTION_SCHEDULE'].map((type) => ({
    type,
    locale: 'en',
  })),
].map((slot) => ({ ...slot, version: '0.2', status: 'DRAFT' as const }));

// Category-level retention slots from docs/launch-decisions.md §4. Durations remain TBD-LEGAL on
// purpose: no blanket period is invented here, and the erasure job stays disabled until approval.
const retentionPolicySeed = [
  [
    'User credentials and auth provider records',
    'Registration / account closure',
    'Coordinate Supabase Auth closure; retain no unnecessary tokens',
    'Identity',
  ],
  [
    'Public profile and preferences',
    'Active account / deletion request',
    'Delete or anonymize subject to justified exceptions',
    'Identity',
  ],
  [
    'Age eligibility status/evidence',
    'Verification / expiration',
    'Keep only the eligibility result and decision metadata',
    'Identity',
  ],
  [
    'Terms acceptance and consent history',
    'Acceptance / withdrawal',
    'Preserve necessary minimal evidence',
    'Compliance',
  ],
  [
    'Membership, registration and attendance',
    'Participation end / account closure',
    'Preserve counts and integrity without exposing deleted user',
    'Participation',
  ],
  [
    'User-authored communities, events and media',
    'Archive/cancel/closure',
    'Prefer archive or cancel for resources with history; review ownership',
    'Communities/Events',
  ],
  [
    'Discussion posts and replies',
    'Deletion, moderation or closure',
    'Anonymize or delete as approved; preserve narrowly justified evidence',
    'Discussions',
  ],
  [
    'Stream DMs, group messages and attachments',
    'Message removal / account closure',
    'Configure Stream retention/deletion and reconcile Wasl IDs',
    'Messaging',
  ],
  [
    'Reports, moderation actions and security evidence',
    'Case closure',
    'Restrict access; preserve only justified evidence',
    'Moderation',
  ],
  [
    'Email and notification delivery logs',
    'Delivery / account closure',
    'Minimize message content and provider metadata',
    'Notifications',
  ],
  [
    'Operational logs and backups',
    'Creation / rotation',
    'Set rotation and restore-based deletion policy',
    'Operations',
  ],
  [
    'Privacy requests and decisions',
    'Case completion',
    'Retain minimal auditable response evidence',
    'Compliance',
  ],
].map(([dataGroup, triggerEvent, handling, owner]) => ({
  dataGroup: dataGroup!,
  triggerEvent: triggerEvent!,
  handling: handling!,
  owner: owner!,
  status: 'TBD_LEGAL' as const,
}));

async function run(): Promise<void> {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Development reference seeds are disabled in production.');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required to seed development data.');
  const pool = new Pool({ connectionString });
  const database = drizzle(pool, { schema });
  try {
    const latest = readMigrationFiles({ migrationsFolder: './drizzle' }).at(-1);
    const applied = await database.execute<{ hash: string }>(
      sql`select hash from drizzle.__drizzle_migrations order by created_at desc limit 1`,
    );
    if (!latest || applied.rows[0]?.hash !== latest.hash)
      throw new Error(
        'Database migrations are not current. Run corepack pnpm db:migrate before seeding.',
      );
    await database
      .insert(cities)
      .values(provinceNames)
      .onConflictDoUpdate({
        target: cities.id,
        set: {
          nameTr: sql`excluded.name_tr`,
          nameAr: sql`excluded.name_ar`,
          nameEn: sql`excluded.name_en`,
        },
      });
    await database
      .insert(categories)
      .values(categorySeed)
      .onConflictDoUpdate({
        target: categories.id,
        set: {
          nameTr: sql`excluded.name_tr`,
          nameAr: sql`excluded.name_ar`,
          nameEn: sql`excluded.name_en`,
        },
      });
    const configuredOwnerEmail = process.env.WASL_SEED_OWNER_EMAIL?.trim().toLowerCase();
    const [configuredOwner] = configuredOwnerEmail
      ? await database
          .select({ id: users.id, displayName: profiles.displayName })
          .from(users)
          .innerJoin(authIdentities, eq(authIdentities.userId, users.id))
          .leftJoin(profiles, eq(profiles.id, users.id))
          .where(
            and(
              eq(users.normalizedEmail, configuredOwnerEmail),
              eq(authIdentities.provider, 'email'),
            ),
          )
          .limit(1)
      : [];
    if (configuredOwnerEmail && !configuredOwner)
      throw new Error('WASL_SEED_OWNER_EMAIL must belong to an existing signed-up account.');
    const [existingOwner] = configuredOwner
      ? []
      : await database
          .select({ id: users.id, displayName: profiles.displayName })
          .from(communities)
          .innerJoin(users, eq(sql`${users.id}::text`, communities.ownerId))
          .innerJoin(authIdentities, eq(authIdentities.userId, users.id))
          .leftJoin(profiles, eq(profiles.id, users.id))
          .where(
            and(eq(communities.id, 'dev-seed-community-01'), eq(communities.ownerType, 'user')),
          )
          .limit(1);
    const seedOwnerId = configuredOwner?.id ?? existingOwner?.id ?? sampleOwnerId;
    const seedHostName =
      configuredOwner?.displayName ?? existingOwner?.displayName ?? 'Wasl Sample Host';
    const storageUrl = process.env.SUPABASE_URL;
    const storageKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!storageUrl || !storageKey)
      throw new Error('Supabase Storage credentials are required to seed profile pictures.');
    const storage = createClient(storageUrl, storageKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const summary = await seedDevelopmentData(database, storage, seedOwnerId, seedHostName);
    await database
      .insert(legalDocuments)
      .values(legalDocumentSlots)
      .onConflictDoNothing({
        target: [legalDocuments.type, legalDocuments.version, legalDocuments.locale],
      });
    await database
      .insert(retentionPolicies)
      .values(retentionPolicySeed)
      .onConflictDoNothing({ target: retentionPolicies.dataGroup });
    console.log('Development seed completed:', summary);
  } finally {
    await pool.end();
  }
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
