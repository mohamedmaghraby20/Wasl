import {
  boolean,
  check,
  foreignKey,
  integer,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  index,
  primaryKey,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const cities = pgTable(
  'cities',
  {
    id: text('id').primaryKey(),
    nameTr: text('name_tr').notNull(),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('cities_name_tr_unique').on(table.nameTr)],
);

export const categories = pgTable(
  'categories',
  {
    id: text('id').primaryKey(),
    nameTr: text('name_tr').notNull(),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('categories_name_tr_unique').on(table.nameTr)],
);

export const communities = pgTable(
  'communities',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    cityId: text('city_id')
      .notNull()
      .references(() => cities.id),
    ownerType: text('owner_type').notNull(),
    ownerId: text('owner_id').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    hostName: text('host_name').notNull(),
    admissionMode: text('admission_mode').notNull(),
    capacity: integer('capacity'),
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('communities_owner_type_check', sql`${table.ownerType} in ('user', 'organization')`),
    check(
      'communities_admission_mode_check',
      sql`${table.admissionMode} in ('open', 'approval', 'automatic')`,
    ),
    check('communities_capacity_check', sql`${table.capacity} is null or ${table.capacity} > 0`),
    index('communities_public_created_idx').on(table.archived, table.createdAt),
    index('communities_created_by_user_id_idx').on(table.createdByUserId),
  ],
);

export const communityCategories = pgTable(
  'community_categories',
  {
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
  },
  (table) => [uniqueIndex('community_categories_pk').on(table.communityId, table.categoryId)],
);

export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    visibility: text('visibility').notNull().default('public'),
    hostType: text('host_type').notNull(),
    hostId: text('host_id').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    hostName: text('host_name').notNull(),
    communityId: text('community_id').references(() => communities.id),
    cityId: text('city_id').references(() => cities.id),
    online: boolean('online').notNull().default(false),
    locationName: text('location_name'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    admissionMode: text('admission_mode').notNull(),
    capacity: integer('capacity'),
    cancelled: boolean('cancelled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('events_visibility_check', sql`${table.visibility} in ('public', 'unlisted')`),
    check(
      'events_host_type_check',
      sql`${table.hostType} in ('user', 'organization', 'community')`,
    ),
    check(
      'events_host_relation_check',
      sql`(${table.hostType} = 'community' and ${table.communityId} is not null and ${table.hostId} = ${table.communityId}) or (${table.hostType} in ('user', 'organization') and ${table.communityId} is null)`,
    ),
    check(
      'events_location_check',
      sql`${table.online} = true or (${table.cityId} is not null and ${table.locationName} is not null)`,
    ),
    check(
      'events_dates_check',
      sql`${table.endsAt} is null or ${table.endsAt} >= ${table.startsAt}`,
    ),
    check(
      'events_admission_mode_check',
      sql`${table.admissionMode} in ('instant', 'approval', 'automatic')`,
    ),
    check('events_capacity_check', sql`${table.capacity} is null or ${table.capacity} > 0`),
    index('events_public_start_idx').on(table.visibility, table.cancelled, table.startsAt),
    index('events_created_by_user_id_idx').on(table.createdByUserId),
  ],
);

export const eventCategories = pgTable(
  'event_categories',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
  },
  (table) => [uniqueIndex('event_categories_pk').on(table.eventId, table.categoryId)],
);

export const discussionThreads = pgTable(
  'discussion_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: text('event_id').references(() => events.id, { onDelete: 'restrict' }),
    communityId: text('community_id').references(() => communities.id, { onDelete: 'restrict' }),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'restrict' }),
    title: text('title'),
    body: text('body'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    archivedByUserId: uuid('archived_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('discussion_threads_event_unique').on(table.eventId),
    index('discussion_threads_community_created_idx').on(table.communityId, table.createdAt),
    index('discussion_threads_author_idx').on(table.authorUserId),
    check(
      'discussion_threads_parent_check',
      sql`(${table.eventId} is not null and ${table.communityId} is null and ${table.authorUserId} is null and ${table.title} is null and ${table.body} is null) or (${table.eventId} is null and ${table.communityId} is not null and ${table.authorUserId} is not null and ${table.title} is not null and ${table.body} is not null)`,
    ),
    check(
      'discussion_threads_title_length',
      sql`${table.title} is null or char_length(${table.title}) between 1 and 160`,
    ),
    check(
      'discussion_threads_body_length',
      sql`${table.body} is null or char_length(${table.body}) between 1 and 5000`,
    ),
    check(
      'discussion_threads_archive_check',
      sql`(${table.archivedAt} is null and ${table.archivedByUserId} is null) or (${table.archivedAt} is not null and ${table.archivedByUserId} is not null)`,
    ),
    index('discussion_threads_archived_by_idx').on(table.archivedByUserId),
  ],
).enableRLS();

export const discussionPosts = pgTable(
  'discussion_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => discussionThreads.id, { onDelete: 'restrict' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    depth: integer('depth').notNull().default(0),
    parentId: uuid('parent_id'),
    parentDepth: integer('parent_depth'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedByUserId: uuid('deleted_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('discussion_posts_parent_target_unique').on(table.id, table.depth, table.threadId),
    foreignKey({
      name: 'discussion_posts_root_parent_fk',
      columns: [table.parentId, table.parentDepth, table.threadId],
      foreignColumns: [table.id, table.depth, table.threadId],
    }).onDelete('restrict'),
    index('discussion_posts_thread_created_idx').on(table.threadId, table.createdAt),
    index('discussion_posts_parent_created_idx').on(table.parentId, table.createdAt),
    index('discussion_posts_author_idx').on(table.authorUserId),
    index('discussion_posts_deleted_by_idx').on(table.deletedByUserId),
    check('discussion_posts_body_length', sql`char_length(${table.body}) between 1 and 5000`),
    check(
      'discussion_posts_reply_depth_check',
      sql`(${table.depth} = 0 and ${table.parentId} is null and ${table.parentDepth} is null) or (${table.depth} = 1 and ${table.parentId} is not null and ${table.parentDepth} = 0)`,
    ),
    check(
      'discussion_posts_deletion_check',
      sql`(${table.deletedAt} is null and ${table.deletedByUserId} is null) or (${table.deletedAt} is not null and ${table.deletedByUserId} is not null)`,
    ),
  ],
).enableRLS();

export const messagingUserMappings = pgTable(
  'messaging_user_mappings',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'restrict' }),
    providerUserId: text('provider_user_id').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'messaging_user_mappings_provider_id_length',
      sql`char_length(${table.providerUserId}) between 1 and 100`,
    ),
  ],
).enableRLS();

export const messagingConversations = pgTable(
  'messaging_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(),
    communityId: text('community_id').references(() => communities.id, { onDelete: 'restrict' }),
    eventId: text('event_id').references(() => events.id, { onDelete: 'restrict' }),
    dmUserLowId: uuid('dm_user_low_id').references(() => users.id, { onDelete: 'restrict' }),
    dmUserHighId: uuid('dm_user_high_id').references(() => users.id, { onDelete: 'restrict' }),
    providerChannelId: text('provider_channel_id').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('messaging_conversations_community_unique').on(table.communityId),
    uniqueIndex('messaging_conversations_event_unique').on(table.eventId),
    uniqueIndex('messaging_conversations_dm_pair_unique').on(table.dmUserLowId, table.dmUserHighId),
    index('messaging_conversations_dm_high_idx').on(table.dmUserHighId),
    check(
      'messaging_conversations_provider_id_length',
      sql`char_length(${table.providerChannelId}) between 1 and 100`,
    ),
    check(
      'messaging_conversations_kind_check',
      sql`(${table.kind} = 'community' and ${table.communityId} is not null and ${table.eventId} is null and ${table.dmUserLowId} is null and ${table.dmUserHighId} is null) or (${table.kind} = 'event' and ${table.eventId} is not null and ${table.communityId} is null and ${table.dmUserLowId} is null and ${table.dmUserHighId} is null) or (${table.kind} = 'dm' and ${table.communityId} is null and ${table.eventId} is null and ${table.dmUserLowId} is not null and ${table.dmUserHighId} is not null and ${table.dmUserLowId} < ${table.dmUserHighId})`,
    ),
  ],
).enableRLS();

export const messagingMemberSync = pgTable(
  'messaging_member_sync',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => messagingConversations.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    providerMember: boolean('provider_member').notNull().default(false),
    desiredMember: boolean('desired_member').notNull().default(true),
    lastError: text('last_error'),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'messaging_member_sync_pk', columns: [table.conversationId, table.userId] }),
    index('messaging_member_sync_user_idx').on(table.userId),
    index('messaging_member_sync_checked_idx').on(table.lastCheckedAt),
    check(
      'messaging_member_sync_error_length',
      sql`${table.lastError} is null or char_length(${table.lastError}) <= 2000`,
    ),
  ],
).enableRLS();

export const messagingUserBlocks = pgTable(
  'messaging_user_blocks',
  {
    blockerUserId: uuid('blocker_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    blockedUserId: uuid('blocked_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'messaging_user_blocks_pk',
      columns: [table.blockerUserId, table.blockedUserId],
    }),
    index('messaging_user_blocks_blocked_idx').on(table.blockedUserId),
    check('messaging_user_blocks_not_self', sql`${table.blockerUserId} <> ${table.blockedUserId}`),
  ],
).enableRLS();

export const messagingReports = pgTable(
  'messaging_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterUserId: uuid('reporter_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reportedUserId: uuid('reported_user_id').references(() => users.id, { onDelete: 'restrict' }),
    conversationId: uuid('conversation_id').references(() => messagingConversations.id, {
      onDelete: 'restrict',
    }),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messaging_reports_reporter_created_idx').on(table.reporterUserId, table.createdAt),
    index('messaging_reports_conversation_created_idx').on(table.conversationId, table.createdAt),
    check('messaging_reports_reason_length', sql`char_length(${table.reason}) between 1 and 2000`),
    check(
      'messaging_reports_target_check',
      sql`${table.reportedUserId} is not null or ${table.conversationId} is not null`,
    ),
  ],
).enableRLS();

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    eventKey: text('event_key').notNull(),
    type: text('type').notNull(),
    contextType: text('context_type').notNull(),
    contextId: text('context_id').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('notifications_recipient_event_unique').on(table.recipientUserId, table.eventKey),
    index('notifications_recipient_created_idx').on(table.recipientUserId, table.createdAt),
    index('notifications_recipient_unread_idx')
      .on(table.recipientUserId, table.createdAt)
      .where(sql`${table.readAt} is null`),
    check('notifications_event_key_length', sql`char_length(${table.eventKey}) between 1 and 200`),
    check('notifications_type_length', sql`char_length(${table.type}) between 1 and 80`),
    check(
      'notifications_context_type_check',
      sql`${table.contextType} in ('community', 'event', 'organization')`,
    ),
    check(
      'notifications_context_id_length',
      sql`char_length(${table.contextId}) between 1 and 160`,
    ),
  ],
).enableRLS();

export const notificationEmailDeliveries = pgTable(
  'notification_email_deliveries',
  {
    notificationId: uuid('notification_id')
      .primaryKey()
      .references(() => notifications.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('PENDING'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    providerMessageId: text('provider_message_id'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notification_email_deliveries_due_idx')
      .on(table.nextAttemptAt)
      .where(sql`${table.status} in ('PENDING', 'RETRY')`),
    check(
      'notification_email_deliveries_status_check',
      sql`${table.status} in ('PENDING', 'RETRY', 'SENT', 'FAILED')`,
    ),
    check('notification_email_deliveries_attempt_count_check', sql`${table.attemptCount} >= 0`),
    check(
      'notification_email_deliveries_sent_check',
      sql`(${table.status} = 'SENT' and ${table.sentAt} is not null) or (${table.status} <> 'SENT' and ${table.sentAt} is null)`,
    ),
    check(
      'notification_email_deliveries_provider_id_length',
      sql`${table.providerMessageId} is null or char_length(${table.providerMessageId}) between 1 and 200`,
    ),
    check(
      'notification_email_deliveries_error_length',
      sql`${table.lastError} is null or char_length(${table.lastError}) <= 2000`,
    ),
  ],
).enableRLS();

export const moderationReports = pgTable(
  'moderation_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterUserId: uuid('reporter_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('OPEN'),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id, { onDelete: 'restrict' }),
    decisionNote: text('decision_note'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('moderation_reports_status_created_idx').on(table.status, table.createdAt),
    index('moderation_reports_reporter_created_idx').on(table.reporterUserId, table.createdAt),
    index('moderation_reports_target_idx').on(table.targetType, table.targetId),
    index('moderation_reports_decider_idx').on(table.decidedByUserId),
    check('moderation_reports_target_type_check', sql`${table.targetType} in ('user', 'community', 'event', 'organization', 'post')`),
    check('moderation_reports_target_id_length', sql`char_length(${table.targetId}) between 1 and 160`),
    check('moderation_reports_reason_length', sql`char_length(${table.reason}) between 1 and 2000`),
    check('moderation_reports_status_check', sql`${table.status} in ('OPEN', 'ACTIONED', 'DISMISSED')`),
    check('moderation_reports_decision_note_length', sql`${table.decisionNote} is null or char_length(${table.decisionNote}) <= 2000`),
    check('moderation_reports_decision_check', sql`(${table.status} = 'OPEN' and ${table.decidedByUserId} is null and ${table.decidedAt} is null and ${table.decisionNote} is null) or (${table.status} <> 'OPEN' and ${table.decidedByUserId} is not null and ${table.decidedAt} is not null)`),
  ],
).enableRLS();

export const resourceModerators = pgTable(
  'resource_moderators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: text('community_id').references(() => communities.id, { onDelete: 'restrict' }),
    eventId: text('event_id').references(() => events.id, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    assignedByUserId: uuid('assigned_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('resource_moderators_community_user_unique').on(table.communityId, table.userId),
    uniqueIndex('resource_moderators_event_user_unique').on(table.eventId, table.userId),
    index('resource_moderators_event_idx').on(table.eventId),
    index('resource_moderators_user_idx').on(table.userId),
    index('resource_moderators_assigner_idx').on(table.assignedByUserId),
    check('resource_moderators_scope_check', sql`(${table.communityId} is not null and ${table.eventId} is null) or (${table.communityId} is null and ${table.eventId} is not null)`),
    check('resource_moderators_not_self', sql`${table.userId} <> ${table.assignedByUserId}`),
  ],
).enableRLS();

export const organizationVerificationStatus = pgEnum('organization_verification_status', [
  'PENDING',
  'VERIFIED',
  'REJECTED',
]);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    type: text('type').notNull(),
    cityId: text('city_id').references(() => cities.id),
    locationName: text('location_name'),
    websiteUrl: text('website_url'),
    socialUrl: text('social_url'),
    logoPath: text('logo_path'),
    verificationStatus: organizationVerificationStatus('verification_status')
      .notNull()
      .default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('organizations_name_length', sql`char_length(${table.name}) between 1 and 160`),
    check('organizations_description_length', sql`char_length(${table.description}) <= 5000`),
    check('organizations_type_length', sql`char_length(${table.type}) between 1 and 80`),
    check(
      'organizations_location_name_length',
      sql`${table.locationName} is null or char_length(${table.locationName}) <= 160`,
    ),
    check(
      'organizations_website_url_length',
      sql`${table.websiteUrl} is null or char_length(${table.websiteUrl}) <= 2048`,
    ),
    check(
      'organizations_social_url_length',
      sql`${table.socialUrl} is null or char_length(${table.socialUrl}) <= 2048`,
    ),
    index('organizations_owner_user_id_idx').on(table.ownerUserId),
    index('organizations_city_id_idx').on(table.cityId),
  ],
).enableRLS();

export const organizationAdmins = pgTable(
  'organization_admins',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'organization_admins_organization_user_pk',
      columns: [table.organizationId, table.userId],
    }),
    index('organization_admins_user_id_idx').on(table.userId),
  ],
).enableRLS();

export const organizationAdminInvitationStatus = pgEnum('organization_admin_invitation_status', [
  'PENDING',
  'ACCEPTED',
  'REVOKED',
]);

export const organizationAdminInvitations = pgTable(
  'organization_admin_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    targetUserId: uuid('target_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    invitedByUserId: uuid('invited_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    status: organizationAdminInvitationStatus('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('organization_admin_invitations_token_hash_unique').on(table.tokenHash),
    index('organization_admin_invitations_org_status_created_idx').on(
      table.organizationId,
      table.status,
      table.createdAt,
    ),
    index('organization_admin_invitations_target_status_expiry_idx').on(
      table.targetUserId,
      table.status,
      table.expiresAt,
    ),
    index('organization_admin_invitations_inviter_idx').on(table.invitedByUserId),
    check(
      'organization_admin_invitations_token_hash_length',
      sql`char_length(${table.tokenHash}) = 64`,
    ),
    check(
      'organization_admin_invitations_expiry_after_creation',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      'organization_admin_invitations_distinct_users',
      sql`${table.targetUserId} <> ${table.invitedByUserId}`,
    ),
    check(
      'organization_admin_invitations_response_matches_status',
      sql`(${table.status} = 'PENDING' and ${table.respondedAt} is null) or (${table.status} in ('ACCEPTED', 'REVOKED') and ${table.respondedAt} is not null)`,
    ),
  ],
).enableRLS();

export const organizationVerificationRequestStatus = pgEnum(
  'organization_verification_request_status',
  ['PENDING', 'APPROVED', 'REJECTED'],
);

export const organizationVerificationRequests = pgTable(
  'organization_verification_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    requestedByUserId: uuid('requested_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: organizationVerificationRequestStatus('status').notNull().default('PENDING'),
    requestNote: text('request_note'),
    decisionNote: text('decision_note'),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('organization_verification_requests_pending_unique')
      .on(table.organizationId)
      .where(sql`${table.status} = 'PENDING'`),
    index('organization_verification_requests_org_created_idx').on(
      table.organizationId,
      table.createdAt,
    ),
    index('organization_verification_requests_status_created_idx').on(
      table.status,
      table.createdAt,
    ),
    index('organization_verification_requests_requester_idx').on(table.requestedByUserId),
    index('organization_verification_requests_decider_idx').on(table.decidedByUserId),
    check(
      'organization_verification_requests_request_note_length',
      sql`${table.requestNote} is null or char_length(${table.requestNote}) <= 2000`,
    ),
    check(
      'organization_verification_requests_decision_note_length',
      sql`${table.decisionNote} is null or char_length(${table.decisionNote}) <= 2000`,
    ),
    check(
      'organization_verification_requests_decision_matches_status',
      sql`(${table.status} = 'PENDING' and ${table.decidedAt} is null and ${table.decidedByUserId} is null and ${table.decisionNote} is null) or (${table.status} in ('APPROVED', 'REJECTED') and ${table.decidedAt} is not null and ${table.decidedByUserId} is not null)`,
    ),
  ],
).enableRLS();

export const communityMemberStatus = pgEnum('community_member_status', [
  'PENDING',
  'WAITLISTED',
  'ACTIVE',
  'REJECTED',
  'LEFT',
  'REMOVED',
]);
export const eventRegistrationStatus = pgEnum('event_registration_status', [
  'PENDING',
  'WAITLISTED',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED_BY_USER',
  'REMOVED_BY_ORGANIZER',
  'ATTENDED',
  'NO_SHOW',
]);

export const communityMemberships = pgTable(
  'community_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: communityMemberStatus('status').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('community_memberships_community_user_unique').on(table.communityId, table.userId),
    index('community_memberships_queue_idx').on(table.communityId, table.status, table.requestedAt),
    index('community_memberships_user_status_idx').on(table.userId, table.status),
  ],
).enableRLS();

export const communityMembershipTransitions = pgTable(
  'community_membership_transitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => communityMemberships.id, { onDelete: 'restrict' }),
    fromStatus: communityMemberStatus('from_status'),
    toStatus: communityMemberStatus('to_status').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('community_membership_transitions_history_idx').on(table.membershipId, table.createdAt),
  ],
).enableRLS();

export const eventRegistrations = pgTable(
  'event_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: eventRegistrationStatus('status').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('event_registrations_event_user_unique').on(table.eventId, table.userId),
    index('event_registrations_queue_idx').on(table.eventId, table.status, table.requestedAt),
    index('event_registrations_user_status_idx').on(table.userId, table.status),
  ],
).enableRLS();

export const eventRegistrationTransitions = pgTable(
  'event_registration_transitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => eventRegistrations.id, { onDelete: 'restrict' }),
    fromStatus: eventRegistrationStatus('from_status'),
    toStatus: eventRegistrationStatus('to_status').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('event_registration_transitions_history_idx').on(table.registrationId, table.createdAt),
  ],
).enableRLS();

const identity = pgSchema('identity');

export const accountStatus = identity.enum('account_status', [
  'ACTIVE',
  'SUSPENDED',
  'DELETION_PENDING',
  'DEACTIVATED',
]);

export const users = identity
  .table(
    'users',
    {
      id: uuid('id').primaryKey(),
      normalizedEmail: text('normalized_email').notNull(),
      emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
      accountStatus: accountStatus('account_status').notNull().default('ACTIVE'),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      check('users_normalized_email_is_not_empty', sql`length(${table.normalizedEmail}) > 0`),
      check(
        'users_normalized_email_is_lowercase',
        sql`${table.normalizedEmail} = lower(${table.normalizedEmail})`,
      ),
      unique('users_normalized_email_unique').on(table.normalizedEmail),
    ],
  )
  .enableRLS();

export const authIdentities = identity
  .table(
    'auth_identities',
    {
      userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'restrict' }),
      provider: text('provider').notNull(),
      providerUserId: text('provider_user_id').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      primaryKey({
        name: 'auth_identities_provider_provider_user_id_pk',
        columns: [table.provider, table.providerUserId],
      }),
      index('auth_identities_user_id_index').on(table.userId),
    ],
  )
  .enableRLS();

export const profiles = identity
  .table(
    'profiles',
    {
      id: uuid('id')
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
      displayName: text('display_name').notNull(),
      avatarPath: text('avatar_path'),
      bio: text('bio').notNull().default(''),
      cityId: text('city_id').references(() => cities.id),
      interests: text('interests')
        .array()
        .notNull()
        .default(sql`'{}'::text[]`),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      check(
        'profiles_display_name_length',
        sql`char_length(${table.displayName}) between 1 and 80`,
      ),
      check('profiles_bio_length', sql`char_length(${table.bio}) <= 500`),
      index('profiles_city_id_idx').on(table.cityId),
    ],
  )
  .enableRLS();

export const ageEligibilityStatus = identity.enum('age_eligibility_status', [
  'UNVERIFIED',
  '18_PLUS',
  'UNDER_18',
]);

/**
 * Minimal age-eligibility outcome. Only the result, the configured method name and the decision
 * metadata are stored: never a birth date, national ID or identity-document scan.
 */
export const ageEligibilities = identity
  .table(
    'age_eligibilities',
    {
      userId: uuid('user_id')
        .primaryKey()
        .references(() => users.id, { onDelete: 'restrict' }),
      status: ageEligibilityStatus('status').notNull(),
      method: text('method').notNull(),
      decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
      reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, {
        onDelete: 'restrict',
      }),
      note: text('note'),
    },
    (table) => [
      check(
        'age_eligibilities_method_length',
        sql`char_length(${table.method}) between 1 and 80`,
      ),
      check(
        'age_eligibilities_note_length',
        sql`${table.note} is null or char_length(${table.note}) <= 1000`,
      ),
      index('age_eligibilities_status_idx').on(table.status),
      index('age_eligibilities_reviewer_idx').on(table.reviewedByUserId),
    ],
  )
  .enableRLS();

export const legalDocumentStatus = pgEnum('legal_document_status', [
  'DRAFT',
  'APPROVED',
  'PUBLISHED',
  'SUPERSEDED',
]);

/**
 * Versioned legal-document slot. Counsel-owned text is stored here once approved; an empty
 * draft slot must never be served as an approved notice.
 */
export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(),
    version: text('version').notNull(),
    locale: text('locale').notNull(),
    status: legalDocumentStatus('status').notNull().default('DRAFT'),
    content: text('content'),
    contentHash: text('content_hash'),
    approvedBy: text('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('legal_documents_type_version_locale_unique').on(
      table.type,
      table.version,
      table.locale,
    ),
    index('legal_documents_type_status_idx').on(table.type, table.status, table.publishedAt),
    check(
      'legal_documents_type_check',
      sql`${table.type} in ('TERMS_OF_USE', 'PRIVACY_NOTICE', 'AGE_ELIGIBILITY_POLICY', 'COOKIE_NOTICE', 'TAKEDOWN_PROCEDURE', 'PROCESSOR_TRANSFER_REGISTER', 'RETENTION_SCHEDULE')`,
    ),
    check('legal_documents_version_length', sql`char_length(${table.version}) between 1 and 40`),
    check('legal_documents_locale_check', sql`${table.locale} in ('ar', 'en', 'tr')`),
    check(
      'legal_documents_content_hash_format',
      sql`${table.contentHash} is null or ${table.contentHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'legal_documents_approval_check',
      sql`(${table.status} in ('DRAFT', 'SUPERSEDED') and ${table.approvedBy} is null and ${table.approvedAt} is null and ${table.publishedAt} is null) or (${table.status} = 'APPROVED' and ${table.approvedBy} is not null and ${table.approvedAt} is not null and ${table.publishedAt} is null) or (${table.status} = 'PUBLISHED' and ${table.approvedBy} is not null and ${table.approvedAt} is not null and ${table.publishedAt} is not null and ${table.content} is not null)`,
    ),
  ],
).enableRLS();

/**
 * Minimal acceptance evidence: document type, version, user and time. An acknowledgment is not
 * a lawful basis and is never treated as marketing consent.
 */
export const legalAcceptances = pgTable(
  'legal_acceptances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    documentType: text('document_type').notNull(),
    version: text('version').notNull(),
    documentId: uuid('document_id').references(() => legalDocuments.id, {
      onDelete: 'restrict',
    }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('legal_acceptances_user_type_version_unique').on(
      table.userId,
      table.documentType,
      table.version,
    ),
    index('legal_acceptances_document_idx').on(table.documentId),
    check(
      'legal_acceptances_document_type_check',
      sql`${table.documentType} in ('TERMS_OF_USE', 'PRIVACY_NOTICE', 'AGE_ELIGIBILITY_POLICY', 'COOKIE_NOTICE')`,
    ),
    check('legal_acceptances_version_length', sql`char_length(${table.version}) between 1 and 40`),
  ],
).enableRLS();

export const privacyRequestType = pgEnum('privacy_request_type', [
  'ACCESS',
  'CORRECTION',
  'EXPORT',
  'DELETION',
]);

export const privacyRequestStatus = pgEnum('privacy_request_status', [
  'RECEIVED',
  'IN_REVIEW',
  'PENDING_PROVIDER',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
]);

export const privacyRequests = pgTable(
  'privacy_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    requestType: privacyRequestType('request_type').notNull(),
    status: privacyRequestStatus('status').notNull().default('RECEIVED'),
    requestNote: text('request_note'),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    identityVerifiedAt: timestamp('identity_verified_at', { withTimezone: true }),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    decisionNote: text('decision_note'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('privacy_requests_open_deletion_unique')
      .on(table.userId)
      .where(sql`${table.requestType} = 'DELETION' and ${table.status} in ('RECEIVED', 'IN_REVIEW', 'PENDING_PROVIDER')`),
    index('privacy_requests_user_created_idx').on(table.userId, table.createdAt),
    index('privacy_requests_status_due_idx').on(table.status, table.dueAt),
    index('privacy_requests_decider_idx').on(table.decidedByUserId),
    check(
      'privacy_requests_request_note_length',
      sql`${table.requestNote} is null or char_length(${table.requestNote}) <= 2000`,
    ),
    check(
      'privacy_requests_decision_note_length',
      sql`${table.decisionNote} is null or char_length(${table.decisionNote}) <= 2000`,
    ),
    check(
      'privacy_requests_decision_check',
      sql`(${table.status} in ('COMPLETED', 'REJECTED') and ${table.decidedByUserId} is not null and ${table.decidedAt} is not null) or (${table.status} not in ('COMPLETED', 'REJECTED') and ${table.decidedByUserId} is null and ${table.decidedAt} is null)`,
    ),
    check(
      'privacy_requests_completion_check',
      sql`(${table.status} = 'COMPLETED' and ${table.completedAt} is not null) or (${table.status} <> 'COMPLETED' and ${table.completedAt} is null)`,
    ),
  ],
).enableRLS();

export const privacyRequestEvents = pgTable(
  'privacy_request_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => privacyRequests.id, { onDelete: 'restrict' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
    actorRole: text('actor_role').notNull(),
    eventType: text('event_type').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('privacy_request_events_request_created_idx').on(table.requestId, table.createdAt),
    index('privacy_request_events_actor_idx').on(table.actorUserId),
    check(
      'privacy_request_events_actor_role_check',
      sql`${table.actorRole} in ('USER', 'ADMIN', 'SYSTEM')`,
    ),
    check(
      'privacy_request_events_event_type_length',
      sql`char_length(${table.eventType}) between 1 and 80`,
    ),
    check(
      'privacy_request_events_note_length',
      sql`${table.note} is null or char_length(${table.note}) <= 2000`,
    ),
  ],
).enableRLS();

export const privacyProviderActionStatus = pgEnum('privacy_provider_action_status', [
  'PENDING',
  'IN_PROGRESS',
  'SUCCEEDED',
  'FAILED',
  'SKIPPED',
]);

export const privacyProviderActions = pgTable(
  'privacy_provider_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => privacyRequests.id, { onDelete: 'restrict' }),
    provider: text('provider').notNull(),
    action: text('action').notNull(),
    status: privacyProviderActionStatus('status').notNull().default('PENDING'),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('privacy_provider_actions_request_unique').on(
      table.requestId,
      table.provider,
      table.action,
    ),
    index('privacy_provider_actions_status_idx').on(table.status),
    check(
      'privacy_provider_actions_provider_check',
      sql`${table.provider} in ('WASL', 'SUPABASE_AUTH', 'SUPABASE_STORAGE', 'STREAM', 'RESEND')`,
    ),
    check(
      'privacy_provider_actions_action_length',
      sql`char_length(${table.action}) between 1 and 80`,
    ),
    check('privacy_provider_actions_attempts_check', sql`${table.attemptCount} >= 0`),
    check(
      'privacy_provider_actions_completion_check',
      sql`(${table.status} = 'SUCCEEDED' and ${table.completedAt} is not null) or (${table.status} <> 'SUCCEEDED' and ${table.completedAt} is null)`,
    ),
    check(
      'privacy_provider_actions_error_length',
      sql`${table.lastError} is null or char_length(${table.lastError}) <= 2000`,
    ),
  ],
).enableRLS();

export const retentionPolicyStatus = pgEnum('retention_policy_status', ['TBD_LEGAL', 'APPROVED']);

/**
 * Category-level retention slot. `TBD_LEGAL` rows deliberately carry no duration; the erasure job
 * refuses to act until counsel approves a period and the exception handling.
 */
export const retentionPolicies = pgTable(
  'retention_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dataGroup: text('data_group').notNull().unique(),
    triggerEvent: text('trigger_event').notNull(),
    durationDays: integer('duration_days'),
    handling: text('handling').notNull(),
    owner: text('owner').notNull(),
    status: retentionPolicyStatus('status').notNull().default('TBD_LEGAL'),
    approvedBy: text('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'retention_policies_trigger_event_length',
      sql`char_length(${table.triggerEvent}) between 1 and 200`,
    ),
    check(
      'retention_policies_handling_length',
      sql`char_length(${table.handling}) between 1 and 500`,
    ),
    check('retention_policies_owner_length', sql`char_length(${table.owner}) between 1 and 120`),
    check(
      'retention_policies_duration_check',
      sql`(${table.status} = 'TBD_LEGAL' and ${table.durationDays} is null and ${table.approvedBy} is null and ${table.approvedAt} is null) or (${table.status} = 'APPROVED' and ${table.durationDays} is not null and ${table.durationDays} > 0 and ${table.approvedBy} is not null and ${table.approvedAt} is not null)`,
    ),
  ],
).enableRLS();
