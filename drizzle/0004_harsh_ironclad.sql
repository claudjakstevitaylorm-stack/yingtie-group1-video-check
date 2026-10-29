CREATE TABLE `group_memberships` (
	`owner_hash` text PRIMARY KEY NOT NULL,
	`member` text NOT NULL,
	`home_team` text NOT NULL,
	`media_token` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `group_memberships_media_idx` ON `group_memberships` (`media_token`);--> statement-breakpoint
ALTER TABLE `shared_templates` ADD `team` text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE `shared_uploads` ADD `team` text DEFAULT '1' NOT NULL;--> statement-breakpoint
CREATE INDEX `shared_uploads_team_date_idx` ON `shared_uploads` (`team`,`created_at`,`id`);