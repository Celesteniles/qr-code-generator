CREATE TABLE `card_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`full_name` text NOT NULL,
	`title` text,
	`org` text,
	`phone` text,
	`email` text,
	`socials` text,
	`avatar_key` text,
	`theme` text,
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`hostname` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_hostname_unique` ON `domains` (`hostname`);--> statement-breakpoint
CREATE TABLE `link_reviews` (
	`link_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`checked_at` integer,
	`provider` text,
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`domain_id` text NOT NULL,
	`slug` text NOT NULL,
	`kind` text NOT NULL,
	`rule` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `links_workspace` ON `links` (`workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `links_domain_slug` ON `links` (`domain_id`,`slug`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_user_id_workspace_id_unique` ON `memberships` (`user_id`,`workspace_id`);--> statement-breakpoint
CREATE TABLE `qr_designs` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`config` text NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`created_at` integer NOT NULL
);
