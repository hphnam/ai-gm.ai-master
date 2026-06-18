-- Wave 6 follow-up — distinguish background-job-composed notifications
-- (task reminders, future scheduler emits) from human-typed and chat-tool
-- AI-on-behalf-of-user notes. The UI uses this flag to render reminders
-- with the assistant "gm" monogram instead of attributing the message to
-- the task creator (whose name we still expose as secondary context).

ALTER TABLE "notifications" ADD COLUMN "automated" BOOLEAN NOT NULL DEFAULT false;
