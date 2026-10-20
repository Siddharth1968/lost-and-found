-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('STUDENT', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_name` VARCHAR(60) NOT NULL,
    `description` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `categories_category_name_key`(`category_name`),
    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `identifying_details` TEXT NULL,
    `item_type` ENUM('LOST', 'FOUND') NOT NULL,
    `location` VARCHAR(160) NOT NULL,
    `event_date` DATE NOT NULL,
    `status` ENUM('OPEN', 'VERIFIED', 'RETURNED', 'WITHDRAWN') NOT NULL DEFAULT 'OPEN',
    `image_path` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `items_item_type_status_created_at_idx`(`item_type`, `status`, `created_at`),
    INDEX `items_category_id_created_at_idx`(`category_id`, `created_at`),
    INDEX `items_user_id_status_idx`(`user_id`, `status`),
    INDEX `items_location_idx`(`location`),
    INDEX `items_event_date_idx`(`event_date`),
    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `claims` (
    `claim_id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `claimant_id` INTEGER NOT NULL,
    `ownership_proof` TEXT NOT NULL,
    `identifying_details` TEXT NOT NULL,
    `supporting_information` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewed_by` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `review_note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `claims_status_created_at_idx`(`status`, `created_at`),
    INDEX `claims_claimant_id_created_at_idx`(`claimant_id`, `created_at`),
    INDEX `claims_reviewed_by_idx`(`reviewed_by`),
    UNIQUE INDEX `claims_item_id_claimant_id_key`(`item_id`, `claimant_id`),
    PRIMARY KEY (`claim_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `notification_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_is_read_created_at_idx`(`user_id`, `is_read`, `created_at`),
    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_id` INTEGER NOT NULL,
    `action` VARCHAR(60) NOT NULL,
    `entity_type` VARCHAR(30) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_actor_id_created_at_idx`(`actor_id`, `created_at`),
    PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` CHAR(64) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sessions_user_id_idx`(`user_id`),
    INDEX `sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claims` ADD CONSTRAINT `claims_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`item_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claims` ADD CONSTRAINT `claims_claimant_id_fkey` FOREIGN KEY (`claimant_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claims` ADD CONSTRAINT `claims_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- A functional unique index permits many pending/rejected claims but one approved claimant.
CREATE UNIQUE INDEX `claims_one_approved_item` ON `claims`
  ((CASE WHEN `status` = 'APPROVED' THEN `item_id` ELSE NULL END));

ALTER TABLE `claims` ADD CONSTRAINT `claims_review_consistency` CHECK (
  (`status` = 'PENDING' AND `reviewed_at` IS NULL)
  OR (`status` IN ('APPROVED', 'REJECTED') AND `reviewed_at` IS NOT NULL)
);
ALTER TABLE `items` ADD CONSTRAINT `items_verified_found_only` CHECK (
  `status` <> 'VERIFIED' OR `item_type` = 'FOUND'
);

-- Useful even when an authorized operator updates an item directly in MySQL.
-- INSERT ... SELECT avoids client-specific DELIMITER directives.
CREATE TRIGGER `notify_reporter_on_return` AFTER UPDATE ON `items`
FOR EACH ROW
INSERT INTO `notifications` (`user_id`, `message`, `is_read`, `created_at`)
SELECT NEW.`user_id`, CONCAT('Your listing “', NEW.`title`, '” was marked returned after handover.'), FALSE, CURRENT_TIMESTAMP(3)
WHERE NEW.`status` = 'RETURNED' AND OLD.`status` <> 'RETURNED';

-- Public reporting view deliberately excludes contact information and ownership evidence.
CREATE VIEW `public_item_summary` AS
SELECT i.`item_id`, i.`title`, i.`item_type`, i.`status`, i.`location`, i.`event_date`, i.`created_at`,
       c.`category_name`, COUNT(cl.`claim_id`) AS `claim_count`
FROM `items` i
INNER JOIN `categories` c ON c.`category_id` = i.`category_id`
LEFT JOIN `claims` cl ON cl.`item_id` = i.`item_id`
WHERE i.`status` <> 'WITHDRAWN'
GROUP BY i.`item_id`, i.`title`, i.`item_type`, i.`status`, i.`location`, i.`event_date`, i.`created_at`, c.`category_name`;
