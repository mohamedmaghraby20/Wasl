# Graph Report - Wasl  (2026-11-02)

## Corpus Check
- Large corpus: 608 files · ~657,444 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4893 nodes · 13011 edges · 217 communities (146 shown, 71 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 405 edges (avg confidence: 0.86)
- Token cost: unavailable — host subagent results did not expose usage; no Gemini API calls were made.

## Community Hubs (Navigation)
- Live Browser Design Canvas
- Resource Pages and Participation
- React Forms and Controls
- Participation API Client
- Organizations API Client
- Client Routing and Localization
- Organization Domain Services
- Privacy Requests and Providers
- Database Access and Domains
- Live Session Recovery
- Schema and Data Workflows
- Discussions API Client
- Discovery Contracts and Mocks
- Authenticated Profiles and Navigation
- Server Bootstrap and Dependencies
- Design Catalog Validation
- Shared Client Interaction Controls
- Discussion Domain Services
- Design Reasoning Contracts
- Messaging API Client
- Design Output Color Coherence
- Design Search Domain Detection
- HTTP Authentication Boundary
- Screenshot Capture Runtime
- Client Runtime Dependencies
- Privacy Review API Client
- Design Search Tooling
- NestJS Application Modules
- Live Configuration Toolbar
- Live Voice and Chat
- Conversations and Confirmation Dialogs
- Discovery Search and Filtering
- Moderation API Client
- Workspace Scripts and Linting
- Live Browser Initialization
- Live Editing Interaction State
- Launch Decisions and Readiness
- Design Stack Data Contracts
- Participation Rules and Transitions
- Users API and Mocks
- Organization API Mocks
- Participation API Mocks
- Event Management Services
- Inline Document Editing
- Product Architecture and Phases
- Communities API Client
- User Profile Domain Services
- Moderation Domain Services
- Messaging Membership Reconciliation
- Mock Service Worker Setup
- Privacy API Mocks
- Public Discovery Services
- Client Development Dependencies
- Discussion API Mocks
- Supabase Identity and Privacy Gates
- Notification Domain Services
- Interface Design Delivery Workflows
- Design Search Behavior Tests
- Live Session Acceptance Lifecycle
- Render Deployment Configuration
- Participation HTTP Controller
- NestJS Best Practice References
- Events API Client
- Design Documentation and Platform Craft
- Messaging API Mocks
- Community Management Services
- BM25 Retrieval and Tokenization
- Continuous Integration Verification
- Manual Edit Review State
- Privacy and Legal Schema
- Moderation Contracts and Validation
- Messaging HTTP Controller
- Moderation API Mocks
- Live Browser DOM Helpers
- Live Session Persistence
- Identity and Organization Schema
- Svelte Live Injection Anchors
- Release Security Integration Harness
- Discovery Reference Data Contracts
- Deletion and Messaging Workers
- Sitemap and Crawler Generation
- Health API Client
- Platform Moderation Dashboard
- Notifications API Client
- Shared Package Configuration
- Vite and Showcase Configuration
- Storybook Component Stories
- Backend Review and Development Setup
- Live Agent Target Coordination
- Health HTTP Endpoints
- Notification Email Delivery
- Design Catalog Refresh Tests
- Client TypeScript Configuration
- Community and Event Schema
- Messaging Request Response Contracts
- Shared TypeScript Compiler Options
- Client Package Scripts
- Community Topic Page
- Community API Mocks
- Discussion Storage Schema
- Interface Audits and Adaptation
- Browser End To End Tests
- Workspace Dependency Overrides
- Participation Storage Schema
- Participation Request Response Contracts
- Wasl Project Operating Context
- Design Color Mode Resolution
- Server Package Scripts
- Server TypeScript Configuration
- Shadcn Composition and Design Systems
- Design Contrast and State Showcase
- Privacy Export API Client
- Accepted Session Cleanup
- Tooling TypeScript Configuration
- Messaging Conversation Storage
- Component Registry Management
- Chat Composition and Theming
- Supabase Security Reference Workflows
- Postgres Queue and Upsert Patterns
- Postgres Query Performance Diagnosis
- Participation PostgreSQL Integration Tests
- Retrieval Threshold Gate Tests
- Skill Script Path Validation
- Wasl Design Tokens and Typography
- Live Browser Ignore Rules
- Organization Verification Schema
- Resource Moderator Schema
- Shared TypeScript Build Configuration
- Async Errors and Microservice Patterns
- Design System Showcase Composition
- UI UX Design Guidance
- Skill Agent Presentation Metadata
- Organization Admin Invitation Schema
- NestJS CLI Configuration
- Frontend Design Principles
- Dependency Injection Contract Testing
- HTTP Validation and Sanitization
- NestJS Service Testing Guidance
- Design Search CLI Flag Tests
- Retrieval Metric Mathematics
- Community Cover Asset Catalog
- Retention Preview API Client
- Age Review API Client
- Prettier Formatting Configuration
- Server Build TypeScript Configuration
- Reference Category City Schema
- Database Connection Lifecycle
- Shared Health and Pagination Contracts
- Health and Lifecycle Patterns
- Postgres Search and Index Guidance
- Postgres Connection Pool Management
- Postgres Pagination and Composite Indexes
- Postgres Transaction and Foreign Keys
- Design Asset Production Review
- Retrieval Fixture Validation
- Privacy Retry API Client
- Legal Acceptance API Client
- Privacy Cancellation API Client
- Privacy Request Creation Client
- Age Declaration API Client
- Privacy Status API Client
- Messaging Sync and Block Schema
- Interface Segregation and Tokens
- Accessible Field State Composition
- Supabase Scoped Access Tokens
- Postgres Primary Key Strategies
- Wasl SVG Favicon
- Conversation Cover Photograph
- Gathering Cover Photograph
- Together Cover Photograph
- Client TypeScript Project References
- Organization Ownership Product Rules
- Notification Delivery Storage Schema
- Request Context and Provider Scopes
- Shadcn Small Logo
- Chat Tool Output Presentation
- Postgres Security Guidance History
- SQL Reference Authoring Templates
- Prepared Statement Pool Compatibility
- Postgres Bulk Insert Patterns
- Postgres Batch Query Patterns
- Postgres Deadlock Prevention
- Postgres Covering Indexes
- Postgres Operator Index Selection
- Idempotent Database Constraints
- Postgres Data Type Selection
- Postgres Identifier Naming
- Postgres Time Range Partitioning
- Semantic Color Palette Ramps
- Atomic Manual Edit Application
- Interface Gesture Recovery
- Accessibility Test Type Declarations
- Development Sample Data Seeding
- Moderation Report Storage
- Best Practice Rule Template
- Shadcn Logo Asset
- Component Object Icon Passing
- Web Interface Guidelines Review
- Graphify Command Reference
- Public Crawler Exclusions

## God Nodes (most connected - your core abstractions)
1. `waslFetch()` - 113 edges
2. `react-i18next` - 97 edges
3. `getAuthenticatedUser()` - 89 edges
4. `@nestjs/common` - 78 edges
5. `Database` - 78 edges
6. `AuthenticatedUser` - 78 edges
7. `react-router` - 77 edges
8. `Button()` - 72 edges
9. `cn()` - 62 edges
10. `lucide-react` - 61 edges

## Surprising Connections (you probably didn't know these)
- `Wasl browser document shell` --conceptually_related_to--> `Wasl bilingual community and event platform`  [INFERRED]
  client/index.html → README.md
- `TestEndToEndCoherence` --uses--> `DesignSystemGenerator`  [INFERRED]
  .agents/skills/ui-ux-pro-max/scripts/tests/test_design_system_mode.py → .agents/skills/ui-ux-pro-max/scripts/design_system.py
- `TestLightResultOutputCoherence` --uses--> `DesignSystemGenerator`  [INFERRED]
  .agents/skills/ui-ux-pro-max/scripts/tests/test_design_system_mode.py → .agents/skills/ui-ux-pro-max/scripts/design_system.py
- `enableInlineEdit()` --indirect_call--> `own()`  [INFERRED]
  .opencode/skills/impeccable/scripts/live-browser.js → .opencode/skills/impeccable/scripts/live-browser-dom.js
- `"messaging_user_mappings"` --references--> `identity.users`  [EXTRACTED]
  server/drizzle/0015_sad_vin_gonzales.sql → server/drizzle/0004_dapper_masque.sql

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Measured comp-to-shipping delivery** — _opencode_skills_impeccable_reference_new_work_comp_led, _opencode_skills_impeccable_reference_visualize_comps, _opencode_skills_impeccable_reference_region_map_region_map, _opencode_skills_impeccable_reference_visualize_provenance, _opencode_skills_impeccable_reference_new_work_finish_review [EXTRACTED 1.00]
- **Atomic participation correctness flow** — docs_implementation_guide_participation_states, docs_implementation_guide_capacity_transactions, docs_implementation_guide_waitlists, docs_implementation_guide_access_revocation, docs_implementation_guide_notifications [EXTRACTED 1.00]
- **Owner-gated production launch** — docs_implementation_guide_legal_launch_gates, docs_implementation_guide_phase_8, docs_implementation_guide_production_isolation, docs_implementation_guide_owner_release_approval [EXTRACTED 1.00]
- **Adult eligibility, retention sign-off and provider-aware rights handling participate in privacy release readiness** — docs_launch_decisions_adults_only_gate, docs_launch_decisions_retention_legal_gate, docs_launch_decisions_privacy_rights_workflow, docs_launch_decisions_cross_border_review [EXTRACTED 1.00]
- **Workload identification, plan diagnosis and statistics maintenance** — _agents_skills_supabase_postgres_best_practices_references_monitor_pg_stat_statements_query_statistics, _agents_skills_supabase_postgres_best_practices_references_monitor_explain_analyze_explain_analyze, _agents_skills_supabase_postgres_best_practices_references_monitor_vacuum_analyze_statistics_maintenance [INFERRED 0.85]
- **Comp-led asset production, human calibration and independent fidelity review** — _opencode_skills_impeccable_reference_component_review_component_review, _opencode_skills_impeccable_reference_component_review_first_viewport_review, _opencode_skills_impeccable_reference_degraded_asset_producer_asset_producer, _opencode_skills_impeccable_reference_degraded_finish_reviewer_finish_reviewer [INFERRED 0.95]
- **Product capacity rules, authoritative server transaction and row-lock verification form participation correctness** — docs_context_01_product_admission_invariants, docs_context_02_architecture_authoritative_participation, docs_phases_phase_4_capacity_locking [INFERRED 0.95]

## Communities (217 total, 71 thin omitted)

### Community 0 - "Live Browser Design Canvas"
Cohesion: 0.03
Nodes (137): applyGlobalBarLabelState(), applyLiveBarPreference(), applyPlaceholderDimensions(), applyPlaceholderSizingStyles(), averageRgb01(), beginEditPin(), bindEditBadgeProxy(), bufferToBase64() (+129 more)

### Community 1 - "Resource Pages and Participation"
Cohesion: 0.06
Nodes (85): getCommunitiesControllerMineQueryKey(), useCommunitiesControllerArchive(), useCommunitiesControllerRemove(), getDiscoveryControllerCommunityQueryKey(), getDiscoveryControllerEventQueryKey(), getDiscoveryControllerListCommunitiesQueryKey(), getDiscoveryControllerListEventsQueryKey(), useDiscoveryControllerCommunity() (+77 more)

### Community 2 - "React Forms and Controls"
Cohesion: 0.05
Nodes (81): useCommunitiesControllerCreate(), useCommunitiesControllerUpdate(), getCommunityDiscussionsControllerListQueryKey(), getCommunityDiscussionsControllerListQueryOptions(), useCommunityDiscussionsControllerCreate(), useCommunityDiscussionsControllerList(), useEventsControllerCreate(), useEventsControllerUpdate() (+73 more)

### Community 3 - "Participation API Client"
Cohesion: 0.03
Nodes (107): isPublicRead(), resolveApiUrl(), authMocks, waslFetch(), getParticipationControllerCancelEventRegistrationMutationKey(), getParticipationControllerCancelEventRegistrationMutationOptions(), getParticipationControllerCancelEventRegistrationUrl(), getParticipationControllerCommunityCountsQueryKey() (+99 more)

### Community 4 - "Organizations API Client"
Cohesion: 0.03
Nodes (104): getOrganizationsControllerAcceptAdminInvitationMutationKey(), getOrganizationsControllerAcceptAdminInvitationMutationOptions(), getOrganizationsControllerAcceptAdminInvitationUrl(), getOrganizationsControllerCreateAdminInvitationMutationKey(), getOrganizationsControllerCreateAdminInvitationMutationOptions(), getOrganizationsControllerCreateAdminInvitationUrl(), getOrganizationsControllerCreateMutationKey(), getOrganizationsControllerCreateMutationOptions() (+96 more)

### Community 5 - "Client Routing and Localization"
Cohesion: 0.07
Nodes (48): ApiError, mocks, mocks, mocks, auth, communityResponse, eventResponse, HistoryControls() (+40 more)

### Community 6 - "Organization Domain Services"
Cohesion: 0.06
Nodes (29): OrganizationsController, AcceptedOrganizationAdminInvitationDto, AcceptOrganizationAdminInvitationDto, CreatedOrganizationAdminInvitationDto, CreateOrganizationAdminInvitationDto, CreateOrganizationDto, DecidedOrganizationVerificationDto, DecideOrganizationVerificationDto (+21 more)

### Community 7 - "Privacy Requests and Providers"
Cohesion: 0.05
Nodes (28): PrivacyAdminController, PrivacyController, ACCEPTABLE_DOCUMENT_TYPES, AcceptDocumentDto, AcceptedDocumentDto, AdminAgeEligibilityDto, AdminPrivacyRequestDto, CreatePrivacyRequestDto (+20 more)

### Community 8 - "Database Access and Domains"
Cohesion: 0.07
Nodes (29): dotenv, drizzle-orm, @nestjs/config, pg, DATABASE, Database, PROVIDER_DATABASE, mocks (+21 more)

### Community 9 - "Live Session Recovery"
Cohesion: 0.06
Nodes (90): abortSvelteComponentInjection(), applyParamDefaults(), applyParamValue(), applySavedSessionMeta(), buildParamsPanel(), captureAndEmit(), checkpointPayload(), cleanup() (+82 more)

### Community 10 - "Schema and Data Workflows"
Cohesion: 0.06
Nodes (71): buildDevelopmentSeed(), capacities, communityHistory(), eventHistory(), places, sampleOwnerEmail, sampleOwnerId, seedId() (+63 more)

### Community 11 - "Discussions API Client"
Cohesion: 0.03
Nodes (87): communityDiscussionsControllerClose(), CommunityDiscussionsControllerCloseMutationError, CommunityDiscussionsControllerCloseMutationResult, CommunityDiscussionsControllerCloseMutationVariables, communityDiscussionsControllerCreate(), CommunityDiscussionsControllerCreateMutationBody, CommunityDiscussionsControllerCreateMutationError, CommunityDiscussionsControllerCreateMutationResult (+79 more)

### Community 12 - "Discovery Contracts and Mocks"
Cohesion: 0.03
Nodes (80): AcceptDocumentDtoDocumentType, AcceptedDocumentDto, AcceptedOrganizationAdminInvitationDtoRole, AdminAgeEligibilityDtoStatus, AdminPrivacyRequestDtoRequestType, AdminPrivacyRequestDtoStatus, CategoryPublicDto, CityPublicDto (+72 more)

### Community 13 - "Authenticated Profiles and Navigation"
Cohesion: 0.07
Nodes (62): useModerationControllerReport(), getOrganizationsControllerListAdminInvitationsQueryKey(), getOrganizationsControllerListAdminInvitationsQueryOptions(), getOrganizationsControllerListManagersQueryKey(), getOrganizationsControllerListManagersQueryOptions(), getOrganizationsControllerListVerificationRequestsQueryKey(), getOrganizationsControllerListVerificationRequestsQueryOptions(), getOrganizationsControllerMineQueryKey() (+54 more)

### Community 14 - "Server Bootstrap and Dependencies"
Cohesion: 0.04
Nodes (60): class-transformer, drizzle-kit, @fastify/helmet, @nestjs/cli, @nestjs/core, @nestjs/platform-fastify, @nestjs/terminus, @nestjs/testing (+52 more)

### Community 15 - "Design Catalog Validation"
Cohesion: 0.06
Nodes (44): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, TestGeneratedCatalogContract, _catalog_date(), _check_app_interface_contract() (+36 more)

### Community 16 - "Shared Client Interaction Controls"
Cohesion: 0.08
Nodes (54): authenticatedRoutePaths, requiresAuthentication(), accountLinks, Brand(), navItemClass(), primaryLinks, RootLayout(), AppFooter() (+46 more)

### Community 17 - "Discussion Domain Services"
Cohesion: 0.09
Nodes (15): CommunityDiscussionsController, DiscussionsController, CommunityTopicDetailsDto, CommunityTopicDto, CommunityTopicPageDto, CreateCommunityTopicDto, CreateDiscussionPostDto, DiscussionPostDto (+7 more)

### Community 18 - "Design Reasoning Contracts"
Cohesion: 0.06
Nodes (13): DesignSystemGenerator, _resolve_dial(), apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action(), TestReasoningMatch, read_rows() (+5 more)

### Community 19 - "Messaging API Client"
Cohesion: 0.04
Nodes (65): getMessagingControllerBlockedUsersUrl(), getMessagingControllerBlockMutationKey(), getMessagingControllerBlockMutationOptions(), getMessagingControllerBlockUrl(), getMessagingControllerCommunityMutationKey(), getMessagingControllerCommunityMutationOptions(), getMessagingControllerCommunityUrl(), getMessagingControllerConversationsQueryOptions() (+57 more)

### Community 20 - "Design Output Color Coherence"
Cohesion: 0.05
Nodes (21): ansi_ljust(), _button_outline_text_color(), _contrast_ratio(), _derive_dark_palette(), _filter_anti_patterns_for_mode(), format_ascii_box(), add_wrapped(), wrap_text() (+13 more)

### Community 21 - "Design Search Domain Detection"
Cohesion: 0.05
Nodes (26): _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature(), _legacy_successor_guidance() (+18 more)

### Community 22 - "HTTP Authentication Boundary"
Cohesion: 0.07
Nodes (22): fastify, @nestjs/swagger, AccountStatus, fastify, FastifyRequest, PlatformAdminGuard, guardFor(), PRIVACY_GATE_EXEMPT (+14 more)

### Community 23 - "Screenshot Capture Runtime"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 24 - "Client Runtime Dependencies"
Cohesion: 0.05
Nodes (55): dependencies, class-variance-authority@0.7.1, clsx@2.1.1, @hookform/resolvers@5.2.1, i18next@25.5.2, lucide-react@0.544.0, @radix-ui/react-alert-dialog@1.2.1, @radix-ui/react-checkbox@1.4.1 (+47 more)

### Community 25 - "Privacy Review API Client"
Cohesion: 0.04
Nodes (55): getPrivacyAdminControllerDecideMutationKey(), getPrivacyAdminControllerDecideMutationOptions(), getPrivacyAdminControllerDecideUrl(), getPrivacyAdminControllerListUrl(), getPrivacyControllerListRequestsQueryKey(), getPrivacyControllerListRequestsQueryOptions(), getPrivacyControllerListRequestsUrl(), privacyAdminControllerDecide() (+47 more)

### Community 26 - "Design Search Tooling"
Cohesion: 0.06
Nodes (11): _detect_page_type(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides(), persist_design_system(), safe_slug(), _write_persisted_file(), format_output() (+3 more)

### Community 27 - "NestJS Application Modules"
Cohesion: 0.10
Nodes (21): @nestjs/common, HealthModule, Environment, environmentSchema, optionalText, validateEnvironment(), DatabaseModule, AuthModule (+13 more)

### Community 28 - "Live Configuration Toolbar"
Cohesion: 0.08
Nodes (54): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+46 more)

### Community 29 - "Live Voice and Chat"
Cohesion: 0.08
Nodes (54): agentHasWorkInFlight(), armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer() (+46 more)

### Community 30 - "Conversations and Confirmation Dialogs"
Cohesion: 0.08
Nodes (44): getDiscussionsControllerListEventPostsQueryKey(), getDiscussionsControllerListEventPostsQueryOptions(), useDiscussionsControllerClose(), useDiscussionsControllerCreateEventPost(), useDiscussionsControllerListEventPosts(), useDiscussionsControllerRemove(), useDiscussionsControllerUpdate(), withQueryKey() (+36 more)

### Community 31 - "Discovery Search and Filtering"
Cohesion: 0.07
Nodes (48): discoveryControllerCategories(), DiscoveryControllerCategoriesQueryError, DiscoveryControllerCategoriesQueryResult, discoveryControllerCities(), DiscoveryControllerCitiesQueryError, DiscoveryControllerCitiesQueryResult, discoveryControllerCommunity(), DiscoveryControllerCommunityQueryError (+40 more)

### Community 32 - "Moderation API Client"
Cohesion: 0.05
Nodes (50): getModerationControllerDecideMutationKey(), getModerationControllerDecideMutationOptions(), getModerationControllerDecideUrl(), getModerationControllerListUrl(), getModerationControllerReportMutationKey(), getModerationControllerReportMutationOptions(), getModerationControllerReportUrl(), getModeratorAssignmentsControllerAssignMutationKey() (+42 more)

### Community 33 - "Workspace Scripts and Linting"
Cohesion: 0.05
Nodes (47): devDependencies, eslint@9.35.0, eslint-import-resolver-typescript@4.3.5, @eslint/js@9.35.0, eslint-plugin-import@2.32.0, eslint-plugin-jsx-a11y@6.10.2, eslint-plugin-react-hooks@5.2.0, prettier@3.6.2 (+39 more)

### Community 34 - "Live Browser Initialization"
Cohesion: 0.07
Nodes (47): agentStatusText(), barPaletteForTheme(), brandMarkSvg(), buildDesignHeader(), cursorForInsertAxis(), designPanelCss(), detectPageTheme(), own() (+39 more)

### Community 35 - "Live Editing Interaction State"
Cohesion: 0.12
Nodes (47): beginNewLiveConfiguration(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanupAcceptedSession(), clearAnnotations(), clearInsertPicking(), clearScrollY() (+39 more)

### Community 36 - "Launch Decisions and Readiness"
Cohesion: 0.05
Nodes (33): Publicly readable native discussions with membership-gated posting, Discover → Evaluate → Join/Register → Admission → Participate → Manage → Communicate, Public Communities and public or direct-link-only Unlisted Events, Wasl nationwide community and event platform for Arabs in Türkiye, Server-authoritative Join Event transaction and concurrency control, Approved technology baseline, not proof of installed dependencies, Supabase, Stream, Resend, Render and GitHub Actions provider baseline, Nest OpenAPI → Orval typed clients and MSW mocks (+25 more)

### Community 37 - "Design Stack Data Contracts"
Cohesion: 0.07
Nodes (8): search_stack(), _rows(), TestNativeDesktopStackFreshness, read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval, _rows(), TestWebStackFreshness

### Community 38 - "Participation Rules and Transitions"
Cohesion: 0.14
Nodes (11): AuthenticatedUser, countStatuses(), ParticipationService, assertCommunityTransition(), assertEventTransition(), CommunityStatus, communityTransitions, EventStatus (+3 more)

### Community 39 - "Users API and Mocks"
Cohesion: 0.07
Nodes (42): getUsersControllerCurrentUrl(), getUsersControllerPublicProfileQueryKey(), getUsersControllerPublicProfileQueryOptions(), getUsersControllerPublicProfileUrl(), getUsersControllerSearchQueryKey(), getUsersControllerSearchQueryOptions(), getUsersControllerSearchUrl(), getUsersControllerUpdateMutationKey() (+34 more)

### Community 40 - "Organization API Mocks"
Cohesion: 0.08
Nodes (43): AcceptedOrganizationAdminInvitationDto, CreatedOrganizationAdminInvitationDto, DecidedOrganizationVerificationDto, ManagedOrganizationDto, OrganizationAdminInvitationDto, OrganizationManagerDto, OrganizationVerificationQueueItemDto, OrganizationVerificationRequestDto (+35 more)

### Community 41 - "Participation API Mocks"
Cohesion: 0.08
Nodes (43): CommunityMemberDto, CommunityMemberPreviewDto, MembershipStateDto, MyActivityDto, ParticipantListItemDto, ParticipationCountsDto, ParticipationDecisionDto, RegistrationStateDto (+35 more)

### Community 42 - "Event Management Services"
Cohesion: 0.07
Nodes (3): EventsController, CreateEventDto, slugPart()

### Community 43 - "Inline Document Editing"
Cohesion: 0.06
Nodes (43): addManualContextText(), applyEditing(), buildLocatorForLeaf(), canRestoreManualEditElement(), collectEditableTextRows(), visit(), collectManualContextPieces(), walk() (+35 more)

### Community 44 - "Product Architecture and Phases"
Cohesion: 0.07
Nodes (24): Public Communities, Public and Unlisted Events, docs/launch-decisions.md, Task 149: qualified legal launch review, Scoped moderation and platform administration, Explicit MVP exclusions, Phase 1: Foundation and local tooling (tasks 1–25), Phase 2: Public discovery (tasks 26–49) (+16 more)

### Community 45 - "Communities API Client"
Cohesion: 0.06
Nodes (40): communitiesControllerArchive(), CommunitiesControllerArchiveMutationError, CommunitiesControllerArchiveMutationResult, CommunitiesControllerArchiveMutationVariables, communitiesControllerCreate(), CommunitiesControllerCreateMutationBody, CommunitiesControllerCreateMutationError, CommunitiesControllerCreateMutationResult (+32 more)

### Community 46 - "User Profile Domain Services"
Cohesion: 0.10
Nodes (3): UsersController, UpdateProfileDto, UsersService

### Community 47 - "Moderation Domain Services"
Cohesion: 0.14
Nodes (5): ModerationController, ModeratorAssignmentsController, ModerationService, main(), main()

### Community 48 - "Messaging Membership Reconciliation"
Cohesion: 0.16
Nodes (5): directMessagePair(), providerChannelId(), providerUserId(), MessagingService, main()

### Community 49 - "Mock Service Worker Setup"
Cohesion: 0.10
Nodes (27): @faker-js/faker@10.6.0, msw@2.11.2, CreatedResourceDto, HealthResponseDto, ReadinessResponseDto, ReadNotificationDto, getEventsControllerCancelMockHandler(), getEventsControllerCancelResponseMock() (+19 more)

### Community 50 - "Privacy API Mocks"
Cohesion: 0.11
Nodes (33): AdminAgeEligibilityDto, AdminPrivacyRequestDto, PrivacyControllerExportData200, PrivacyRequestDto, PrivacyStatusDto, RetentionPreviewDto, getPrivacyAdminControllerDecideMockHandler(), getPrivacyAdminControllerDecideResponseMock() (+25 more)

### Community 51 - "Public Discovery Services"
Cohesion: 0.14
Nodes (5): DiscoveryController, listingQuery(), main(), createController(), QueryStub

### Community 52 - "Client Development Dependencies"
Cohesion: 0.06
Nodes (30): devDependencies, @chromatic-com/storybook@4.1.0, jest-axe@10.0.0, jsdom@26.1.0, orval@8.43.0, storybook@9.1.5, @storybook/addon-a11y@9.1.5, @storybook/addon-vitest@9.1.5 (+22 more)

### Community 53 - "Discussion API Mocks"
Cohesion: 0.12
Nodes (29): CommunityTopicDetailsDto, CommunityTopicDto, CommunityTopicPageDto, DiscussionPostDto, DiscussionPostPageDto, getCommunityDiscussionsControllerCloseMockHandler(), getCommunityDiscussionsControllerCloseResponseMock(), getCommunityDiscussionsControllerCreateMockHandler() (+21 more)

### Community 54 - "Supabase Identity and Privacy Gates"
Cohesion: 0.10
Nodes (10): PrivacyGateService, eligibleGate, notExempt, displayNameFrom(), authUser, serviceWith(), SUPABASE_AUTH_CLIENT, SupabaseAuthService (+2 more)

### Community 56 - "Interface Design Delivery Workflows"
Cohesion: 0.08
Nodes (3): New visual work workflow, Core Web Vitals, Direction comps and asset production

### Community 57 - "Design Search Behavior Tests"
Cohesion: 0.10
Nodes (6): search(), _style_search_destination(), TestDiagnosticsContracts, TestSearchDomains, read_rows(), TestStyleTaxonomy

### Community 58 - "Live Session Acceptance Lifecycle"
Cohesion: 0.11
Nodes (28): abandonForeignSession(), abandonSupersededGo(), applyOriginalAttrsToSvelteAnchor(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase(), discardOrphanedSession() (+20 more)

### Community 59 - "Render Deployment Configuration"
Cohesion: 0.07
Nodes (28): fromService, key, sync, value, envVarKey, name, type, name (+20 more)

### Community 61 - "NestJS Best Practice References"
Cohesion: 0.09
Nodes (10): NestJS rule categories and priorities, ClassSerializerInterceptor, ValidationPipe, DeprecationInterceptor, OrderCreatedEvent, DataLoader batching, Shutdown-aware readiness, ConfigModule (+2 more)

### Community 62 - "Events API Client"
Cohesion: 0.10
Nodes (26): eventsControllerCancel(), EventsControllerCancelMutationError, EventsControllerCancelMutationResult, EventsControllerCancelMutationVariables, eventsControllerCreate(), EventsControllerCreateMutationBody, EventsControllerCreateMutationError, EventsControllerCreateMutationResult (+18 more)

### Community 63 - "Design Documentation and Platform Craft"
Cohesion: 0.09
Nodes (15): Craft deprecated alias, Cognitive Load Assessment, Cowan 2001 working memory limit, Nielsen usability heuristics scoring, Persona-Based Design Testing, Impeccable Documenter, Impeccable Finish Reviewer, Impeccable artifact drift doctor (+7 more)

### Community 64 - "Messaging API Mocks"
Cohesion: 0.13
Nodes (25): MessagingBlockedUserDto, MessagingBlockResultDto, MessagingChannelDto, MessagingConversationItemDto, MessagingReportResultDto, MessagingSessionDto, getMessagingControllerBlockedUsersMockHandler(), getMessagingControllerBlockedUsersResponseMock() (+17 more)

### Community 66 - "BM25 Retrieval and Tokenization"
Cohesion: 0.14
Nodes (5): BM25, _get_bm25(), _suggest_identities(), TestBm25CoreBehavior, TestTokenizer

### Community 67 - "Continuous Integration Verification"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, NODE_ENV, VITE_API_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL, jobs (+15 more)

### Community 68 - "Manual Edit Review State"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 69 - "Privacy and Legal Schema"
Cohesion: 0.14
Nodes (21): age_eligibilities_reviewer_idx, age_eligibilities_status_idx, "identity"."age_eligibilities", "legal_acceptances", legal_acceptances_document_idx, legal_acceptances_user_type_version_unique, "legal_documents", legal_documents_type_status_idx (+13 more)

### Community 70 - "Moderation Contracts and Validation"
Cohesion: 0.20
Nodes (10): class-validator, ModerationKind, community, event, CreatedReportDto, CreateReportDto, DecideReportDto, ModerationPermissionsDto (+2 more)

### Community 72 - "Moderation API Mocks"
Cohesion: 0.17
Nodes (19): CreatedReportDto, ModerationPermissionsDto, ModeratorUserDto, ReportReviewDto, getModerationControllerDecideMockHandler(), getModerationControllerDecideResponseMock(), getModerationControllerListMockHandler(), getModerationControllerListResponseMock() (+11 more)

### Community 73 - "Live Browser DOM Helpers"
Cohesion: 0.16
Nodes (15): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), raiseHitModal() (+7 more)

### Community 74 - "Live Session Persistence"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 75 - "Identity and Organization Schema"
Cohesion: 0.15
Nodes (11): auth_identities_user_id_index, identity.auth_identities, identity.profiles, identity.users, profiles_city_id_idx, auth_identities_user_id_index, "organization_admins", organization_admins_user_id_idx (+3 more)

### Community 76 - "Svelte Live Injection Anchors"
Cohesion: 0.16
Nodes (19): buildSvelteExpressionTextMap(), buildSveltePropValuesFromLiveElement(), buildSveltePropValuesV2(), cloneWithoutElements(), collectTextNodes(), collectVisibleTexts(), cssEscapeIdent(), elementMatchesOriginalMarkup() (+11 more)

### Community 77 - "Release Security Integration Harness"
Cohesion: 0.16
Nodes (15): admin, authClient, cleanupPool, communityIds, eventIds, expectStatus(), jsonRequest(), main() (+7 more)

### Community 78 - "Discovery Reference Data Contracts"
Cohesion: 0.18
Nodes (8): cities, CategoryPublicDto, CityPublicDto, CommunityPageDto, CommunityPublicDto, EventPageDto, EventPublicDto, ReferenceDataRepository

### Community 79 - "Deletion and Messaging Workers"
Cohesion: 0.14
Nodes (4): CommunityDeletionService, ChannelDeletionService, MessagingSyncWorker, main()

### Community 80 - "Sitemap and Crawler Generation"
Cohesion: 0.22
Nodes (15): apiBase, distDir, loadResources(), main(), Page, buildRobotsTxt(), buildSitemapXml(), canonicalResourcePath() (+7 more)

### Community 81 - "Health API Client"
Cohesion: 0.18
Nodes (16): getHealthControllerGetHealthQueryKey(), getHealthControllerGetHealthQueryOptions(), getHealthControllerGetHealthUrl(), getHealthControllerGetReadinessQueryKey(), getHealthControllerGetReadinessQueryOptions(), getHealthControllerGetReadinessUrl(), healthControllerGetHealth(), HealthControllerGetHealthQueryError (+8 more)

### Community 82 - "Platform Moderation Dashboard"
Cohesion: 0.20
Nodes (17): getModerationControllerListQueryKey(), getModerationControllerListQueryOptions(), useModerationControllerDecide(), useModerationControllerList(), withQueryKey(), getOrganizationsControllerListPendingVerificationRequestsQueryKey(), getOrganizationsControllerListPendingVerificationRequestsQueryOptions(), useOrganizationsControllerDecideVerification() (+9 more)

### Community 83 - "Notifications API Client"
Cohesion: 0.16
Nodes (17): getNotificationsControllerListQueryKey(), getNotificationsControllerListQueryOptions(), getNotificationsControllerListUrl(), getNotificationsControllerMarkReadMutationKey(), getNotificationsControllerMarkReadMutationOptions(), getNotificationsControllerMarkReadUrl(), notificationsControllerList(), NotificationsControllerListQueryError (+9 more)

### Community 84 - "Shared Package Configuration"
Cohesion: 0.13
Nodes (17): dependencies, zod@4.6.7, devDependencies, typescript@5.9.2, vitest@3.2.4, exports, typescript, vitest (+9 more)

### Community 85 - "Vite and Showcase Configuration"
Cohesion: 0.12
Nodes (12): components, missing, source, [uiArg, ...roots], uiDir, walk(), @tailwindcss/vite@4.1.13, vite@7.1.5 (+4 more)

### Community 86 - "Storybook Component Stories"
Cohesion: 0.12
Nodes (12): @storybook/react-vite@9.1.5, Default, meta, Story, IconActions, meta, Primary, Secondary (+4 more)

### Community 87 - "Backend Review and Development Setup"
Cohesion: 0.13
Nodes (3): Backend NestJS best-practices review, Local development setup, Local quality verification commands

### Community 88 - "Live Agent Target Coordination"
Cohesion: 0.29
Nodes (17): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+9 more)

### Community 89 - "Health HTTP Endpoints"
Cohesion: 0.17
Nodes (3): HealthController, HealthResponseDto, ReadinessResponseDto

### Community 90 - "Notification Email Delivery"
Cohesion: 0.16
Nodes (4): NotificationEmailWorker, setup(), ResendEmailAdapter, input

### Community 92 - "Client TypeScript Configuration"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, baseUrl, jsx, lib, module, moduleResolution, noEmit (+6 more)

### Community 93 - "Community and Event Schema"
Cohesion: 0.20
Nodes (10): "communities", communities_public_created_idx, "community_categories", community_categories_pk, "event_categories", event_categories_pk, "events", events_public_start_idx (+2 more)

### Community 94 - "Messaging Request Response Contracts"
Cohesion: 0.30
Nodes (9): BlockUserDto, CreateDirectMessageDto, MessagingBlockedUserDto, MessagingBlockResultDto, MessagingChannelDto, MessagingConversationItemDto, MessagingReportResultDto, MessagingSessionDto (+1 more)

### Community 95 - "Shared TypeScript Compiler Options"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, module, moduleResolution, noFallthroughCasesInSwitch (+6 more)

### Community 96 - "Client Package Scripts"
Cohesion: 0.14
Nodes (14): scripts, api:generate, build, build-storybook, dev, lint, preview, sitemap (+6 more)

### Community 97 - "Community Topic Page"
Cohesion: 0.24
Nodes (13): getCommunitiesControllerMineQueryOptions(), useCommunitiesControllerMine(), getCommunityDiscussionsControllerDetailsQueryKey(), getCommunityDiscussionsControllerDetailsQueryOptions(), useCommunityDiscussionsControllerClose(), useCommunityDiscussionsControllerDetails(), useCommunityDiscussionsControllerPost(), useCommunityDiscussionsControllerRemove() (+5 more)

### Community 98 - "Community API Mocks"
Cohesion: 0.25
Nodes (13): DeletedCommunityDto, ManagedCommunityDto, getCommunitiesControllerArchiveMockHandler(), getCommunitiesControllerArchiveResponseMock(), getCommunitiesControllerCreateMockHandler(), getCommunitiesControllerCreateResponseMock(), getCommunitiesControllerMineMockHandler(), getCommunitiesControllerMineResponseMock() (+5 more)

### Community 99 - "Discussion Storage Schema"
Cohesion: 0.22
Nodes (10): "discussion_posts", discussion_posts_author_idx, discussion_posts_deleted_by_idx, discussion_posts_parent_created_idx, discussion_posts_thread_created_idx, "discussion_threads", discussion_threads_author_idx, discussion_threads_community_created_idx (+2 more)

### Community 100 - "Interface Audits and Adaptation"
Cohesion: 0.18
Nodes (6): Impeccable slash command, Android Material 3 platform conformance, Audit Health Score and P0-P3 findings, Five-dimension native technical audit, Five-dimension web technical audit, Impeccable design skill

### Community 101 - "Browser End To End Tests"
Cohesion: 0.15
Nodes (4): event, list, @playwright/test@1.55.0, @playwright/test

### Community 102 - "Workspace Dependency Overrides"
Cohesion: 0.15
Nodes (12): zod, dependencies, overrides, fastify, js-yaml, lodash, @nestjs/core>path-to-regexp, @nestjs/platform-fastify>path-to-regexp (+4 more)

### Community 103 - "Participation Storage Schema"
Cohesion: 0.23
Nodes (10): "community_membership_transitions", community_membership_transitions_history_idx, "community_memberships", community_memberships_queue_idx, community_memberships_user_status_idx, "event_registration_transitions", event_registration_transitions_history_idx, "event_registrations" (+2 more)

### Community 104 - "Participation Request Response Contracts"
Cohesion: 0.37
Nodes (10): CommunityActivityItemDto, CommunityMemberDto, CommunityMemberPreviewDto, EventActivityItemDto, MembershipStateDto, MyActivityDto, ParticipantListItemDto, ParticipationCountsDto (+2 more)

### Community 105 - "Wasl Project Operating Context"
Cohesion: 0.18
Nodes (8): Wasl agent operating instructions, Claude agent instruction reference, Manrope and Tajawal font delivery, Wasl browser document shell, Gemini agent instruction reference, Wasl provider integrations, Remaining launch approval and verification gaps, Wasl bilingual community and event platform

### Community 106 - "Design Color Mode Resolution"
Cohesion: 0.21
Nodes (4): _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution

### Community 107 - "Server Package Scripts"
Cohesion: 0.17
Nodes (12): scripts, build, db:generate, db:migrate, db:seed, dev, lint, openapi:generate (+4 more)

### Community 108 - "Server TypeScript Configuration"
Cohesion: 0.17
Nodes (11): compilerOptions, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, outDir, rootDir, useDefineForClassFields (+3 more)

### Community 109 - "Shadcn Composition and Design Systems"
Cohesion: 0.20
Nodes (6): Accessible Field form composition, DESIGN.md design-system workflow, CLI preset management, Base UI versus Radix primitive APIs, CLI project context, shadcn/ui

### Community 110 - "Design Contrast and State Showcase"
Cohesion: 0.25
Nodes (6): ColorPair(), contrast(), luminance(), toHex(), toRgb(), defaultStates

### Community 111 - "Privacy Export API Client"
Cohesion: 0.18
Nodes (11): getPrivacyControllerExportDataQueryKey(), getPrivacyControllerExportDataQueryOptions(), getPrivacyControllerExportDataUrl(), getPrivacyControllerGetRequestQueryKey(), getPrivacyControllerGetRequestQueryOptions(), getPrivacyControllerGetRequestUrl(), privacyControllerExportData(), privacyControllerGetRequest() (+3 more)

### Community 112 - "Accepted Session Cleanup"
Cohesion: 0.31
Nodes (11): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey(), reloadAfterMissingAcceptedDom(), restoreAcceptedDomFromSnapshot() (+3 more)

### Community 113 - "Tooling TypeScript Configuration"
Cohesion: 0.20
Nodes (9): compilerOptions, allowImportingTsExtensions, module, moduleResolution, noEmit, tsBuildInfoFile, extends, include (+1 more)

### Community 114 - "Messaging Conversation Storage"
Cohesion: 0.33
Nodes (7): "messaging_conversations", messaging_conversations_community_unique, messaging_conversations_dm_high_idx, messaging_conversations_dm_pair_unique, messaging_conversations_event_unique, "messaging_user_mappings", messaging_conversations_pending_deletion_idx

### Community 115 - "Component Registry Management"
Cohesion: 0.29
Nodes (6): Preset overwrite, merge or skip, shadcn CLI, shadcn MCP server, Built registry item payloads, Registry dependency addresses, Source registry

### Community 116 - "Chat Composition and Theming"
Cohesion: 0.25
Nodes (5): Custom color registration, Base render versus Radix asChild, Message and Bubble conversation turns, Semantic component composition, Semantic styling and built-in variants

### Community 117 - "Supabase Security Reference Workflows"
Cohesion: 0.25
Nodes (4): Skill feedback issue template, Permission-based skill feedback workflow, Declarative versus imperative schema workflows, Supabase development skill

### Community 118 - "Postgres Queue and Upsert Patterns"
Cohesion: 0.25
Nodes (4): PostgreSQL INSERT ON CONFLICT documentation, PostgreSQL Advisory Locks documentation, PostgreSQL SELECT FOR UPDATE SKIP LOCKED documentation, PostgreSQL Partial Indexes documentation

### Community 119 - "Postgres Query Performance Diagnosis"
Cohesion: 0.25
Nodes (4): Supabase EXPLAIN and database inspection documentation, Supabase pg_stat_statements documentation, Supabase VACUUM operations documentation, Supabase Query Optimization documentation

### Community 120 - "Participation PostgreSQL Integration Tests"
Cohesion: 0.46
Nodes (7): createTestTables(), identityIds, main(), makeUsers(), quoteIdentifier(), seedResources(), setupPool

### Community 122 - "Skill Script Path Validation"
Cohesion: 0.38
Nodes (3): resolve(), shipped_invocations(), SkillScriptPathsTest

### Community 123 - "Wasl Design Tokens and Typography"
Cohesion: 0.29
Nodes (5): Manrope and Tajawal bilingual typography with logical RTL layout, Interactive themeable design-system preview, Wasl Design System Preview v1, Production token copies in client/src/styles, Phase 1 local setup and server-only secrets

### Community 125 - "Live Browser Ignore Rules"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 126 - "Organization Verification Schema"
Cohesion: 0.52
Nodes (6): "organization_verification_requests", organization_verification_requests_decider_idx, organization_verification_requests_org_created_idx, organization_verification_requests_pending_unique, organization_verification_requests_requester_idx, organization_verification_requests_status_created_idx

### Community 127 - "Resource Moderator Schema"
Cohesion: 0.52
Nodes (6): "resource_moderators", resource_moderators_assigner_idx, resource_moderators_community_user_unique, resource_moderators_event_idx, resource_moderators_event_user_unique, resource_moderators_user_idx

### Community 128 - "Shared TypeScript Build Configuration"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../tsconfig.base.json

### Community 129 - "Async Errors and Microservice Patterns"
Cohesion: 0.33
Nodes (3): EventPattern fire-and-forget, MessagePattern request-response, BullMQ

### Community 130 - "Design System Showcase Composition"
Cohesion: 0.33
Nodes (3): DESIGN.md token and recipe mapping, ColorPair contrast measurement, Design system showcase page

### Community 131 - "UI UX Design Guidance"
Cohesion: 0.40
Nodes (4): Native app professional UI delivery checklist, WCAG 2.2 interaction accessibility, Ten-category UX rule reference, UI/UX Pro Max design intelligence

### Community 132 - "Skill Agent Presentation Metadata"
Cohesion: 0.33
Nodes (5): interface, display_name, icon_large, icon_small, short_description

### Community 133 - "Organization Admin Invitation Schema"
Cohesion: 0.60
Nodes (5): "organization_admin_invitations", organization_admin_invitations_inviter_idx, organization_admin_invitations_org_status_created_idx, organization_admin_invitations_target_status_expiry_idx, organization_admin_invitations_token_hash_unique

### Community 134 - "NestJS CLI Configuration"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, builder, $schema, sourceRoot

### Community 138 - "NestJS Service Testing Guidance"
Cohesion: 0.40
Nodes (3): Mocked repository dependencies, NestJS Testing documentation, RolesGuard execution-context testing

### Community 141 - "Community Cover Asset Catalog"
Cohesion: 0.40
Nodes (4): conversation.jpg, gathering.jpg, together.jpg, Unsplash usage license

### Community 142 - "Retention Preview API Client"
Cohesion: 0.40
Nodes (5): getPrivacyAdminControllerRetentionQueryKey(), getPrivacyAdminControllerRetentionQueryOptions(), getPrivacyAdminControllerRetentionUrl(), privacyAdminControllerRetention(), usePrivacyAdminControllerRetention()

### Community 143 - "Age Review API Client"
Cohesion: 0.40
Nodes (5): getPrivacyAdminControllerReviewAgeMutationKey(), getPrivacyAdminControllerReviewAgeMutationOptions(), getPrivacyAdminControllerReviewAgeUrl(), privacyAdminControllerReviewAge(), usePrivacyAdminControllerReviewAge()

### Community 144 - "Prettier Formatting Configuration"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 145 - "Server Build TypeScript Configuration"
Cohesion: 0.40
Nodes (4): ./tsconfig.json, exclude, extends, include

### Community 146 - "Reference Category City Schema"
Cohesion: 0.60
Nodes (4): "categories", categories_name_tr_unique, "cities", cities_name_tr_unique

### Community 148 - "Shared Health and Pagination Contracts"
Cohesion: 0.40
Nodes (4): HealthResponse, healthResponseSchema, Pagination, paginationSchema

### Community 156 - "Privacy Retry API Client"
Cohesion: 0.50
Nodes (4): getPrivacyAdminControllerRetryMutationKey(), getPrivacyAdminControllerRetryMutationOptions(), getPrivacyAdminControllerRetryUrl(), privacyAdminControllerRetry()

### Community 157 - "Legal Acceptance API Client"
Cohesion: 0.50
Nodes (4): getPrivacyControllerAcceptMutationKey(), getPrivacyControllerAcceptMutationOptions(), getPrivacyControllerAcceptUrl(), privacyControllerAccept()

### Community 158 - "Privacy Cancellation API Client"
Cohesion: 0.50
Nodes (4): getPrivacyControllerCancelRequestMutationKey(), getPrivacyControllerCancelRequestMutationOptions(), getPrivacyControllerCancelRequestUrl(), privacyControllerCancelRequest()

### Community 159 - "Privacy Request Creation Client"
Cohesion: 0.50
Nodes (4): getPrivacyControllerCreateRequestMutationKey(), getPrivacyControllerCreateRequestMutationOptions(), getPrivacyControllerCreateRequestUrl(), privacyControllerCreateRequest()

### Community 160 - "Age Declaration API Client"
Cohesion: 0.50
Nodes (4): getPrivacyControllerDeclareAgeMutationKey(), getPrivacyControllerDeclareAgeMutationOptions(), getPrivacyControllerDeclareAgeUrl(), privacyControllerDeclareAge()

### Community 161 - "Privacy Status API Client"
Cohesion: 0.50
Nodes (4): getPrivacyControllerStatusQueryKey(), getPrivacyControllerStatusQueryOptions(), getPrivacyControllerStatusUrl(), privacyControllerStatus()

### Community 162 - "Messaging Sync and Block Schema"
Cohesion: 0.50
Nodes (3): "messaging_member_sync", "messaging_reports", "messaging_user_blocks"

### Community 168 - "Wasl SVG Favicon"
Cohesion: 0.67
Nodes (3): White crossing line mark with horizontal ends, rounded caps and joins, and 5-unit stroke, SVG favicon: teal rounded square with white crossing strokes, 64-by-64 teal background (#136f63) with 16-unit rounded corners

### Community 170 - "Gathering Cover Photograph"
Cohesion: 0.67
Nodes (3): Gathering community cover photograph, Group togetherness, Scenic waterfront outing

### Community 171 - "Together Cover Photograph"
Cohesion: 0.67
Nodes (3): Group together at sunset, Outdoor gathering in a hillside landscape, Social connection and togetherness

## Ambiguous Edges - Review These
- `Tasks 147–149 blocked on approved legal and privacy inputs` → `18+ declaration, legal acceptance, privacy export and provider-deletion retry foundations`  [AMBIGUOUS]
  docs/project_handoff.md · relation: conceptually_related_to
- `Separate production providers, no sample data and manual owner-approved release` → `Reuse current Supabase, Stream and Resend with public MVP sample data`  [AMBIGUOUS]
  docs/production-handoff.md · relation: conceptually_related_to
- `Rotate exposed development database password before continued use` → `Rotate exposed database password immediately after launch`  [AMBIGUOUS]
  docs/production-handoff.md · relation: conceptually_related_to

## Knowledge Gaps
- **126 isolated node(s):** `../tsconfig.base.json`, `../tsconfig.base.json`, `community`, `event`, `./tsconfig.json` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1298 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@tanstack/react-query` connect `Client Routing and Localization` to `Resource Pages and Participation`, `React Forms and Controls`, `Participation API Client`, `Organizations API Client`, `Discussions API Client`, `Authenticated Profiles and Navigation`, `Messaging API Client`, `Client Runtime Dependencies`, `Privacy Review API Client`, `Conversations and Confirmation Dialogs`, `Discovery Search and Filtering`, `Moderation API Client`, `Users API and Mocks`, `Communities API Client`, `Events API Client`, `Health API Client`, `Platform Moderation Dashboard`, `Notifications API Client`, `Community Topic Page`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `../tsconfig.base.json`, `../tsconfig.base.json`, `community` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Live Browser Design Canvas` be split into smaller, more focused modules?**
  _Cohesion score 0.02856298630946518 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `NestJS Application Modules` to `Moderation Contracts and Validation`, `Organization Domain Services`, `Database Access and Domains`, `Participation Request Response Contracts`, `Schema and Data Workflows`, `Server Bootstrap and Dependencies`, `Discovery Reference Data Contracts`, `Deletion and Messaging Workers`, `Discussion Domain Services`, `HTTP Authentication Boundary`, `Supabase Identity and Privacy Gates`, `Health HTTP Endpoints`, `Notification Email Delivery`, `Messaging Request Response Contracts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `Resource Pages and Participation` be split into smaller, more focused modules?**
  _Cohesion score 0.062407862407862405 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Tasks 147–149 blocked on approved legal and privacy inputs` and `18+ declaration, legal acceptance, privacy export and provider-deletion retry foundations`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Separate production providers, no sample data and manual owner-approved release` and `Reuse current Supabase, Stream and Resend with public MVP sample data`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._

## Token Accounting

Host-agent token usage is unavailable in the tool results. Internal zero placeholders are not a measurement of session usage; no Gemini API was used.

## Coverage Limitations

Detection skipped four sensitive-flagged files: `.npmrc`, `client/src/styles/tokens.css`, `docs/design/tokens.css`, and `docs/design/tokens.json`. The AST extractor reported 37 code files with no modeled symbols. Semantic extraction covers the full 184-file document/image corpus, including installed skills; these are reference material, not evidence that the application implements their recommendations.

The AST metadata additionally marks 43 structured-data files as intentionally skipped and one failed source: `.opencode/skills/impeccable/scripts/data/font-index.json`. The failed file's manifest hashes are left blank so a future update retries it rather than treating it as successfully indexed.

## Graph Health

WARNING: 170 dangling-endpoint edges; 11 self-loop edges; 742 collapsed directed edges; 751 collapsed undirected edges. Graph is usable, but these issues limit relationship completeness.

`graphify-out/` was written into the working tree and is not ignored; commit only the outputs the team should share. See https://docs.graphify.com/guides/team-workflows.
