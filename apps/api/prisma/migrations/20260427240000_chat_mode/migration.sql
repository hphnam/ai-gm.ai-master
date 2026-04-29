-- Phase E (Task #12) — conversation mode classifier output.
-- 'default' = standard GM assistant behaviour.
-- 'incident' = emergency / safety / injury → gather facts, escalate to GM.
-- 'handover' = end-of-shift summary for the next manager.
-- 'training' = guided procedural walkthrough / quiz.

ALTER TABLE "ChatConversation"
  ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'default';
