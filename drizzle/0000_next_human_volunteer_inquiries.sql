CREATE TABLE IF NOT EXISTS `next_human_volunteer_inquiries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `reference` text NOT NULL,
  `status` text DEFAULT 'new' NOT NULL,
  `full_name` text NOT NULL,
  `age_range` text NOT NULL,
  `city` text NOT NULL,
  `mobile` text NOT NULL,
  `email` text NOT NULL,
  `profession_or_institution` text NOT NULL,
  `primary_contribution_area` text NOT NULL,
  `source` text DEFAULT 'website' NOT NULL,
  `payload` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `next_human_volunteer_inquiries_reference_unique`
ON `next_human_volunteer_inquiries` (`reference`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_next_human_inquiries_status_created`
ON `next_human_volunteer_inquiries` (`status`, `created_at`);
