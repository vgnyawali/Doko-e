ALTER TABLE `partner_memberships` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `partner_memberships` ADD `invite_token_hash` text;--> statement-breakpoint
ALTER TABLE `partner_memberships` ADD `invite_expires_at` text;--> statement-breakpoint
ALTER TABLE `partner_memberships` ADD `session_version` integer DEFAULT 0 NOT NULL;