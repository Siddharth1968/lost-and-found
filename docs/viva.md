# DBMS viva preparation

1. **Why a relational database?** Users, items, categories and claims have structured relationships needing foreign keys, uniqueness and atomic transactions.
2. **What is a primary key?** A unique non-null row identifier; `items.item_id` identifies a report independently of its title.
3. **What is a foreign key?** A constrained reference; `items.category_id` must reference an existing category.
4. **What is referential integrity?** References stay valid. Deleting a referenced category fails because its item history must remain meaningful.
5. **Why not store category names in every item?** Separate category rows avoid repeated metadata and update anomalies.
6. **How is 1NF satisfied?** Every field is scalar and every entity has a key; claims are separate rows instead of repeating groups.
7. **How is 2NF satisfied?** Entity attributes depend on their whole key; no partial dependency on part of a composite key is introduced.
8. **How is 3NF satisfied?** Non-key data describes its entity, while user/category details are referenced instead of transitively duplicated.
9. **What is an alternate/candidate key?** Another minimal unique identifier. Email is a candidate key for users; the surrogate ID is the chosen PK.
10. **Why unique(item_id,claimant_id)?** It permits at most one claim per student for a particular item, also blocking repeated rejected claims.
11. **How can multiple pending claims coexist with only one approval?** The functional unique index stores item_id for APPROVED rows and NULL otherwise. MySQL permits many NULL entries in a unique index.
12. **What does INNER JOIN demonstrate?** It combines an item with its existing category through category_id.
13. **Why use LEFT JOIN for claim counts?** Items without claims must still appear, with a zero count.
14. **COUNT(*) versus COUNT(claim_id)?** COUNT(*) counts joined rows; COUNT(claim_id) excludes NULLs, giving zero for an item without claims after LEFT JOIN.
15. **WHERE versus HAVING?** WHERE filters rows before grouping; HAVING filters groups, such as categories having at least two items.
16. **What are aggregate functions?** COUNT, SUM, MIN, MAX and AVG summarize rows; dashboards use real COUNT queries.
17. **What is a view?** A stored query. `public_item_summary` combines category and claim-count reporting without private evidence.
18. **What does the trigger do?** `notify_reporter_on_return` inserts a notification after an item first transitions to RETURNED.
19. **What is a transaction?** A set of operations that commit or roll back together; approval includes claim/item changes, notifications and audit.
20. **Explain ACID here.** Atomicity prevents partial approval; consistency preserves constraints; isolation/locks serialize decisions; durability persists committed data via InnoDB.
21. **How is a race between administrators handled?** Both lock the item first with SELECT FOR UPDATE. The second reads the changed state and receives a conflict; the unique approval index is an additional defense.
22. **Why READ COMMITTED?** Explicit item locks serialize the critical workflow, while statements see committed state without using broad serializable range locks.
23. **What is rollback?** It undoes all uncommitted transactional writes, including notification-trigger inserts. A deliberate FK-failure integration test proves this.
24. **Why indexes, and what is their cost?** They accelerate selective filtering/joins/sorts but consume storage and add write maintenance. Leading-wildcard search still scans candidates.
25. **Why separate VERIFIED from RETURNED?** Approval is an ownership decision; RETURNED records actual handover. Treating them separately prevents a false physical-return record.

Additional discussion: MySQL DDL implicitly commits, so a failed migration can leave partial schema objects. Migrate only dedicated/project databases and inspect before recovery. Domain workflows use soft withdrawal to preserve evidence and audit history; DELETE is demonstrated with unused categories and transaction-scoped SQL examples.
