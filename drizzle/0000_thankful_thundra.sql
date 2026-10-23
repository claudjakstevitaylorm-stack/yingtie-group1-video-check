CREATE TABLE `shared_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`sha` text NOT NULL,
	`name` text NOT NULL,
	`member` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`feature` text NOT NULL,
	`owner_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shared_templates_sha_unique` ON `shared_templates` (`sha`);--> statement-breakpoint
CREATE TABLE `shared_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`member` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`state` text NOT NULL,
	`size` integer NOT NULL,
	`mime` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`owner_hash` text NOT NULL,
	`video_ready` integer DEFAULT 0 NOT NULL,
	`status` text,
	`score` real,
	`duration` real,
	`report` text,
	`error` text
);
