CREATE TABLE `partner_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text,
	`submission_id` text,
	`actor_type` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `partner_audit_partner` ON `partner_audit_log` (`partner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `partner_catalog_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL,
	`file_name` text NOT NULL,
	`media_type` text NOT NULL,
	`status` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`error_summary` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `partner_catalog_imports_partner` ON `partner_catalog_imports` (`partner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `partner_collections` (
	`partner_id` text NOT NULL,
	`collection_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`partner_id`, `collection_id`),
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `catalog_collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `partner_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partner_memberships_partner_email` ON `partner_memberships` (`partner_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `partner_memberships_user` ON `partner_memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `partner_memberships_partner` ON `partner_memberships` (`partner_id`,`status`);--> statement-breakpoint
CREATE TABLE `partner_product_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL,
	`product_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`draft_data` text NOT NULL,
	`partner_message` text DEFAULT '' NOT NULL,
	`admin_feedback` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`submitted_at` text,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `partner_submissions_partner_status` ON `partner_product_submissions` (`partner_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `partner_submissions_status` ON `partner_product_submissions` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `partner_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `partner_review_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`partner_id` text NOT NULL,
	`decision` text NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `partner_product_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `partner_review_submission` ON `partner_review_decisions` (`submission_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `partner_submission_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`partner_id` text NOT NULL,
	`revision_number` integer NOT NULL,
	`data` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `partner_product_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partner_submission_revision_number` ON `partner_submission_revisions` (`submission_id`,`revision_number`);--> statement-breakpoint
CREATE TABLE `partners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`profile_data` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partners_slug_unique` ON `partners` (`slug`);