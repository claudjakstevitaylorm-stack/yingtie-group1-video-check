CREATE INDEX `shared_uploads_date_idx` ON `shared_uploads` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `shared_uploads_owner_idx` ON `shared_uploads` (`owner_hash`,`created_at`);