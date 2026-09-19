CREATE TABLE `product_request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`request_text` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`admin_notes` text DEFAULT '' NOT NULL,
	`source_page` text DEFAULT 'homepage' NOT NULL,
	`customer_email` text
);
--> statement-breakpoint
CREATE INDEX `product_requests_status_date` ON `product_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_requests_date` ON `product_requests` (`created_at`);
