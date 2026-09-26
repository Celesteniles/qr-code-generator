CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`receipt_number` text NOT NULL,
	`plan` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'XAF' NOT NULL,
	`method` text NOT NULL,
	`provider_reference` text,
	`payer_phone` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`metadata` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_receipt_number_unique` ON `payments` (`receipt_number`);--> statement-breakpoint
CREATE INDEX `payments_workspace_created` ON `payments` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_method_reference` ON `payments` (`method`,`provider_reference`);