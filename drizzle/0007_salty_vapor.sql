CREATE TABLE `catalog_collection_products` (
	`collection_id` text NOT NULL,
	`product_id` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`badge` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`collection_id`, `product_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `catalog_collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `catalog_collection_products_order` ON `catalog_collection_products` (`collection_id`,`display_order`);--> statement-breakpoint
CREATE TABLE `catalog_collection_redirects` (
	`old_slug` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `catalog_collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `catalog_collection_redirects_collection` ON `catalog_collection_redirects` (`collection_id`);--> statement-breakpoint
CREATE TABLE `catalog_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`navigation_visible` integer DEFAULT 0 NOT NULL,
	`navigation_order` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_collections_slug_unique` ON `catalog_collections` (`slug`);--> statement-breakpoint
CREATE INDEX `catalog_collections_navigation` ON `catalog_collections` (`status`,`navigation_visible`,`navigation_order`);