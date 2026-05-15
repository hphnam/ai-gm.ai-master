-- Backfill historical task-reminder + compliance-reminder notifications that
-- pre-date the `category`/`automated` distinction. These rows were emitted
-- by the task-reminder cron and the expiry scheduler before the categoriser
-- shipped, so they currently sit as category='chat', automated=false, and
-- render in the Conversations tab as if a coworker had sent them.
--
-- We match on the exact format strings the cron uses (see
-- task-reminder.service.ts) — distinct enough that an org member typing a
-- chat message couldn't accidentally hit them. The (~) operator pins anchored
-- regexes; the second guard limits the rewrite to category='chat' rows so
-- already-categorised emits aren't disturbed.

-- 1. Task reminders with a "due-in X" or "overdue by X" suffix.
UPDATE "notifications"
SET "category" = 'task', "automated" = true
WHERE "category" = 'chat'
  AND "body" ~ '^Reminder — (overdue by [0-9]+[hd]|due in [0-9]+[hd]):';

-- 2. Task reminders for tasks with no due date ("Reminder: <body>"). Strict
-- prefix match so a real chat "Reminder: don't forget..." from a user isn't
-- caught.
UPDATE "notifications"
SET "category" = 'task', "automated" = true
WHERE "category" = 'chat'
  AND "body" ~ '^Reminder: '
  AND "body" !~ '^Reminder — ';

-- 3. Compliance reminders from the expiry scheduler.
UPDATE "notifications"
SET "category" = 'compliance', "automated" = true
WHERE "category" = 'chat'
  AND "body" ~ '^Compliance reminder';
