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
