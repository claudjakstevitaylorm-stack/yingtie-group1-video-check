ALTER TABLE `shared_templates` ADD `category` text DEFAULT '未分类' NOT NULL;--> statement-breakpoint
ALTER TABLE `shared_uploads` ADD `category` text DEFAULT '未分类' NOT NULL;--> statement-breakpoint
ALTER TABLE `shared_uploads` ADD `template_id` text;--> statement-breakpoint
ALTER TABLE `shared_uploads` ADD `template_name` text DEFAULT '' NOT NULL;