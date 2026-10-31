import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { and, eq, sql } from 'drizzle-orm';
import {
  authIdentities,
  categories,
  cities,
  communityMemberships,
  communities,
  communityCategories,
  eventRegistrations,
  events,
  eventCategories,
  legalDocuments,
  profiles,
  retentionPolicies,
  users,
} from './schema';

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

// Public development examples have a synthetic owner, not a sign-in account.
const sampleOwnerId = '00000000-0000-4000-8000-000000000001';
const sampleAttendees = Array.from({ length: 10 }, (_, index) => ({
  id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  normalizedEmail: `seed-attendee-${String(index + 1).padStart(2, '0')}@wasl.invalid`,
  displayName: `Sample Attendee ${String(index + 1).padStart(2, '0')}`,
  cityId: [
    'istanbul',
    'ankara',
    'izmir',
    'antalya',
    'bursa',
    'konya',
    'gaziantep',
    'eskisehir',
    'trabzon',
    'mugla',
  ][index]!,
}));
const sampleCommunities = [
  ['istanbul-language-exchange', 'Istanbul Language Exchange'],
  ['ankara-book-club', 'Ankara Book Club'],
  ['izmir-coastal-walkers', 'Izmir Coastal Walkers'],
  ['antalya-weekend-cyclists', 'Antalya Weekend Cyclists'],
  ['bursa-board-game-circle', 'Bursa Board Game Circle'],
  ['konya-art-and-culture', 'Konya Art and Culture'],
  ['gaziantep-food-explorers', 'Gaziantep Food Explorers'],
  ['eskisehir-tech-meetup', 'Eskisehir Tech Meetup'],
  ['trabzon-outdoor-friends', 'Trabzon Outdoor Friends'],
  ['mugla-community-garden', 'Mugla Community Garden'],
].map(([slug, name], index) => ({
  id: `dev-seed-community-${String(index + 1).padStart(2, '0')}`,
  slug: `dev-seed-${slug}`,
  name: `${name} (Sample)`,
  description: `Sample community ${index + 1} for testing discovery and joining. Not a real organizer.`,
  cityId: [
    'istanbul',
    'ankara',
    'izmir',
    'antalya',
    'bursa',
    'konya',
    'gaziantep',
    'eskisehir',
    'trabzon',
    'mugla',
  ][index]!,
}));

async function run(): Promise<void> {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Development reference seeds are disabled in production.');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required to seed development data.');
  const pool = new Pool({ connectionString });
  const database = drizzle(pool);
  try {
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
    const seedOwnerId = configuredOwner?.id ?? sampleOwnerId;
    const seedHostName = configuredOwner?.displayName ?? 'Wasl Sample Host';
    const storageUrl = process.env.SUPABASE_URL;
    const storageKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!storageUrl || !storageKey)
      throw new Error('Supabase Storage credentials are required to seed profile pictures.');
    const storage = createClient(storageUrl, storageKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    for (const [index, attendee] of sampleAttendees.entries()) {
      const response = await fetch(`https://i.pravatar.cc/160?img=${index + 11}`);
      if (!response.ok) throw new Error(`Sample portrait download failed: ${response.status}`);
      const { error } = await storage.storage
        .from('profile-photos')
        .upload(`dev-seed/${attendee.id}.jpg`, await response.arrayBuffer(), {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (error) throw error;
    }
    await database.transaction(async (tx) => {
      if (!configuredOwner) {
        await tx
          .insert(users)
          .values({ id: sampleOwnerId, normalizedEmail: 'seed-owner@wasl.invalid' })
          .onConflictDoNothing();
        await tx
          .insert(profiles)
          .values({ id: sampleOwnerId, displayName: 'Wasl Sample Host', cityId: 'istanbul' })
          .onConflictDoNothing();
      }
      await tx
        .insert(users)
        .values(sampleAttendees.map(({ id, normalizedEmail }) => ({ id, normalizedEmail })))
        .onConflictDoNothing();
      await tx
        .insert(profiles)
        .values(
          sampleAttendees.map(({ id, displayName, cityId }) => ({
            id,
            displayName,
            cityId,
            avatarPath: `dev-seed/${id}.jpg`,
            bio: 'Fictional profile added by the Wasl development seed.',
          })),
        )
        .onConflictDoUpdate({
          target: profiles.id,
          set: { avatarPath: sql`excluded.avatar_path` },
        });
      const communityRows = sampleCommunities.map((community, index) => ({
        ...community,
        ownerType: 'user',
        ownerId: seedOwnerId,
        createdByUserId: seedOwnerId,
        hostName: seedHostName,
        admissionMode: index % 2 === 0 ? 'open' : 'approval',
        capacity: 30 + index * 5,
      }));
      await tx
        .insert(communities)
        .values(communityRows)
        .onConflictDoUpdate({
          target: communities.id,
          set: {
            ownerType: 'user',
            ownerId: seedOwnerId,
            createdByUserId: seedOwnerId,
            hostName: seedHostName,
          },
        });
      await tx
        .insert(communityMemberships)
        .values(
          sampleCommunities.flatMap((community, index) => {
            const status = index % 2 === 0 ? ('ACTIVE' as const) : ('PENDING' as const);
            return [
              index,
              (index + 1) % sampleAttendees.length,
              (index + 2) % sampleAttendees.length,
              (index + 3) % sampleAttendees.length,
            ].map((attendeeIndex) => ({
              communityId: community.id,
              userId: sampleAttendees[attendeeIndex]!.id,
              status,
            }));
          }),
        )
        .onConflictDoUpdate({
          target: [communityMemberships.communityId, communityMemberships.userId],
          set: { status: sql`excluded.status` },
        });
      await tx
        .insert(communityCategories)
        .values(
          sampleCommunities.map((community, index) => ({
            communityId: community.id,
            categoryId: ['culture', 'education', 'sports'][index % 3]!,
          })),
        )
        .onConflictDoNothing();

      const eventRows = sampleCommunities.map((community, index) => {
        const startsAt = new Date();
        startsAt.setUTCDate(startsAt.getUTCDate() + 7 + index * 3);
        return {
          id: `dev-seed-event-${String(index + 1).padStart(2, '0')}`,
          slug: `dev-seed-${community.slug.replace('dev-seed-', '')}-event`,
          title: `${community.name.replace(' (Sample)', '')} Meetup (Sample)`,
          description: `Sample upcoming event ${index + 1} for testing discovery and registration. Not a real event.`,
          visibility: 'public',
          hostType: 'community',
          hostId: community.id,
          createdByUserId: seedOwnerId,
          hostName: seedHostName,
          communityId: community.id,
          cityId: community.cityId,
          online: false,
          locationName: `Sample location ${index + 1} (not a real venue)`,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
          admissionMode: index % 2 === 0 ? 'instant' : 'approval',
          capacity: 20 + index * 5,
        };
      });
      await tx
        .insert(events)
        .values(eventRows)
        .onConflictDoUpdate({
          target: events.id,
          set: { createdByUserId: seedOwnerId, hostName: seedHostName },
        });
      await tx
        .insert(eventRegistrations)
        .values(
          eventRows.flatMap((event, index) => {
            return Array.from({ length: index % 2 === 0 ? 4 : 6 }, (_, offset) => ({
              eventId: event.id,
              userId: sampleAttendees[(index + offset) % sampleAttendees.length]!.id,
              status: offset < 4 ? ('ACCEPTED' as const) : ('PENDING' as const),
            }));
          }),
        )
        .onConflictDoUpdate({
          target: [eventRegistrations.eventId, eventRegistrations.userId],
          set: { status: sql`excluded.status` },
        });
      await tx
        .insert(eventCategories)
        .values(
          eventRows.map((event, index) => ({
            eventId: event.id,
            categoryId: ['culture', 'education', 'sports'][index % 3]!,
          })),
        )
        .onConflictDoNothing();
    });
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
  } finally {
    await pool.end();
  }
}

void run();
