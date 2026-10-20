-- CampusFind SQL demonstrations: run against the migrated, seeded campusfind DB.
-- No USE statement: select your dedicated CampusFind connection before executing.
-- Mutations below are demonstrations inside transactions and are rolled back.

-- SELECT, WHERE, ORDER BY: discover open electronics without private identifiers.
SELECT i.item_id, i.title, i.item_type, i.location, i.event_date, i.status
FROM items AS i INNER JOIN categories AS c ON c.category_id = i.category_id
WHERE i.status = 'OPEN' AND c.category_name = 'Electronics'
ORDER BY i.created_at DESC, i.item_id DESC LIMIT 12 OFFSET 0;

-- INNER JOIN: category metadata belongs in one related table.
SELECT i.item_id, i.title, c.category_name
FROM items AS i INNER JOIN categories AS c ON i.category_id = c.category_id;

-- LEFT JOIN and COUNT(nullable PK): retain items with zero claims.
SELECT i.item_id, i.title, COUNT(cl.claim_id) AS claim_count
FROM items AS i LEFT JOIN claims AS cl ON cl.item_id = i.item_id
GROUP BY i.item_id, i.title ORDER BY claim_count DESC;

-- GROUP BY, HAVING, aggregates: find categories with multiple reports.
SELECT c.category_name, COUNT(i.item_id) AS reports,
       MIN(i.event_date) AS earliest, MAX(i.event_date) AS latest
FROM categories AS c LEFT JOIN items AS i ON i.category_id = c.category_id
GROUP BY c.category_id, c.category_name HAVING COUNT(i.item_id) >= 2
ORDER BY reports DESC;

-- Aggregation and conditional SUM: dashboard reporting.
SELECT COUNT(*) AS total_reports,
       COALESCE(SUM(item_type = 'LOST' AND status = 'OPEN'), 0) AS active_lost,
       COALESCE(SUM(item_type = 'FOUND' AND status = 'OPEN'), 0) AS active_found,
       COALESCE(SUM(status = 'RETURNED'), 0) AS returned
FROM items;

-- Useful VIEW: safe reporting projection, installed by integrity migration.
SELECT * FROM public_item_summary ORDER BY created_at DESC LIMIT 20;

-- INSERT, SELECT, UPDATE, DELETE, UNIQUE: unused category CRUD, rolled back.
START TRANSACTION;
INSERT INTO categories (category_name, description)
VALUES ('Viva temporary category', 'Transaction-only SQL demonstration');
SET @demo_category_id = LAST_INSERT_ID();
SELECT * FROM categories WHERE category_id = @demo_category_id;
UPDATE categories SET description = 'Updated during the SQL demonstration'
WHERE category_id = @demo_category_id;
DELETE FROM categories WHERE category_id = @demo_category_id;
ROLLBACK;

-- INSERT + PK/FK + row lock + trigger + rollback. Uses fictional seed reporter.
START TRANSACTION;
INSERT INTO items (user_id, category_id, title, description, item_type, location,
                   event_date, status, created_at, updated_at)
SELECT u.user_id, c.category_id, 'Viva transaction notebook',
       'Temporary demonstration report; transaction is rolled back.',
       'LOST', 'Central Library', CURRENT_DATE(), 'OPEN', NOW(3), NOW(3)
FROM users AS u CROSS JOIN categories AS c
WHERE u.email = 'asha@example.test' AND c.category_name = 'Books & Notes';
SET @demo_item_id = LAST_INSERT_ID();
SELECT item_id, status FROM items WHERE item_id = @demo_item_id FOR UPDATE;
UPDATE items SET status = 'RETURNED', updated_at = NOW(3)
WHERE item_id = @demo_item_id AND title = 'Viva transaction notebook' AND status = 'OPEN';
-- The actual return trigger inserts a reporter notification inside this transaction.
SELECT notification_id, message FROM notifications
WHERE user_id = (SELECT user_id FROM users WHERE email = 'asha@example.test')
ORDER BY notification_id DESC LIMIT 1;
ROLLBACK;

-- Schema inspection: CREATE TABLE, PK/FK/UNIQUE, CHECKs, indexes, actual trigger.
-- Complete executable CREATE TABLE/VIEW/TRIGGER statements are in docs/schema.sql.
SHOW CREATE TABLE users;
SHOW CREATE TABLE items;
SHOW CREATE TABLE claims;
SHOW INDEX FROM claims;
SHOW CREATE VIEW public_item_summary;
SHOW CREATE TRIGGER notify_reporter_on_return;

-- Inspect a query plan; index use depends on cardinality and selectivity.
EXPLAIN SELECT item_id, title FROM items
WHERE item_type = 'FOUND' AND status = 'OPEN' ORDER BY created_at DESC LIMIT 12;
