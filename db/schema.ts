import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
export const flashAds = sqliteTable('flash_ads', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
});
export const productRequests = sqliteTable('product_requests', {
  id: text('id').primaryKey(),
  request_text: text('request_text').notNull(),
  created_at: text('created_at').notNull(),
  status: text('status').notNull().default('new'),
  admin_notes: text('admin_notes').notNull().default(''),
  source_page: text('source_page').notNull().default('homepage'),
  customer_email: text('customer_email'),
}, table => [index('product_requests_status_date').on(table.status, table.created_at), index('product_requests_date').on(table.created_at)]);
export const productRequestLimits = sqliteTable('product_request_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expires_at: integer('expires_at').notNull(),
});
export const checkoutOrders = sqliteTable('checkout_orders', {
  id: text('id').primaryKey(),
  session_id: text('session_id').unique(),
  status: text('status').notNull(),
  data: text('data').notNull(),
  payment_data: text('payment_data'),
});
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  data: text('data').notNull(),
});
export const specials = sqliteTable('specials', {
  id: text('id').primaryKey(),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
});
export const siteSettings = sqliteTable('site_settings', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
});

export const catalogCollections = sqliteTable(
  'catalog_collections',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('draft'),
    navigationVisible: integer('navigation_visible').notNull().default(0),
    navigationOrder: integer('navigation_order').notNull().default(0),
    data: text('data').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('catalog_collections_slug_unique').on(table.slug),
    index('catalog_collections_navigation').on(
      table.status,
      table.navigationVisible,
      table.navigationOrder,
    ),
  ],
);

export const catalogCollectionProducts = sqliteTable(
  'catalog_collection_products',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => catalogCollections.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    displayOrder: integer('display_order').notNull().default(0),
    badge: text('badge').notNull().default(''),
    description: text('description').notNull().default(''),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.productId] }),
    index('catalog_collection_products_order').on(
      table.collectionId,
      table.displayOrder,
    ),
  ],
);

export const catalogCollectionRedirects = sqliteTable(
  'catalog_collection_redirects',
  {
    oldSlug: text('old_slug').primaryKey(),
    collectionId: text('collection_id')
      .notNull()
      .references(() => catalogCollections.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('catalog_collection_redirects_collection').on(table.collectionId)],
);

export const partners = sqliteTable('partners', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status').notNull().default('pending'),
  profileData: text('profile_data').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const partnerMemberships = sqliteTable('partner_memberships', {
  id: text('id').primaryKey(),
  partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  email: text('email').notNull(),
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('invited'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [
  uniqueIndex('partner_memberships_partner_email').on(table.partnerId, table.email),
  uniqueIndex('partner_memberships_user').on(table.userId),
  index('partner_memberships_partner').on(table.partnerId, table.status),
]);

export const partnerProductSubmissions = sqliteTable('partner_product_submissions', {
  id: text('id').primaryKey(),
  partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('draft'),
  draftData: text('draft_data').notNull(),
  partnerMessage: text('partner_message').notNull().default(''),
  adminFeedback: text('admin_feedback').notNull().default(''),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  submittedAt: text('submitted_at'),
}, table => [
  index('partner_submissions_partner_status').on(table.partnerId, table.status, table.updatedAt),
  index('partner_submissions_status').on(table.status, table.updatedAt),
]);

export const partnerSubmissionRevisions = sqliteTable('partner_submission_revisions', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull().references(() => partnerProductSubmissions.id, { onDelete: 'cascade' }),
  partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  revisionNumber: integer('revision_number').notNull(),
  data: text('data').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [uniqueIndex('partner_submission_revision_number').on(table.submissionId, table.revisionNumber)]);

export const partnerCatalogImports = sqliteTable('partner_catalog_imports', {
  id: text('id').primaryKey(),
  partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  mediaType: text('media_type').notNull(),
  status: text('status').notNull(),
  rowCount: integer('row_count').notNull().default(0),
  errorSummary: text('error_summary').notNull().default(''),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('partner_catalog_imports_partner').on(table.partnerId, table.createdAt)]);

export const partnerReviewDecisions = sqliteTable('partner_review_decisions', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull().references(() => partnerProductSubmissions.id, { onDelete: 'cascade' }),
  partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  decision: text('decision').notNull(),
  feedback: text('feedback').notNull().default(''),
  actor: text('actor').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('partner_review_submission').on(table.submissionId, table.createdAt)]);

export const partnerCollections = sqliteTable('partner_collections', {
  partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  collectionId: text('collection_id').notNull().references(() => catalogCollections.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
}, table => [primaryKey({ columns: [table.partnerId, table.collectionId] })]);

export const partnerAuditLog = sqliteTable('partner_audit_log', {
  id: text('id').primaryKey(),
  partnerId: text('partner_id'),
  submissionId: text('submission_id'),
  actorType: text('actor_type').notNull(),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
}, table => [index('partner_audit_partner').on(table.partnerId, table.createdAt)]);

export const partnerRateLimits = sqliteTable('partner_rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
