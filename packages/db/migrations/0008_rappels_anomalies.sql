CREATE TABLE `notifications` (
	`key` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_anomalies` (
	`id` text PRIMARY KEY NOT NULL,
	`checkout_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`kind` text NOT NULL,
	`detail` text NOT NULL,
	`deposit` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution` text,
	`resolved_by` text,
	`resolution_note` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`checkout_id`) REFERENCES `checkouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_anomalies_checkout_id_unique` ON `payment_anomalies` (`checkout_id`);--> statement-breakpoint
ALTER TABLE `checkouts` ADD `pawapay_env` text;--> statement-breakpoint
CREATE INDEX `checkouts_status_created` ON `checkouts` (`status`,`created_at`);