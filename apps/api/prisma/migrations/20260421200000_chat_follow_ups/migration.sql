-- Chat follow-up suggestions — store the 2-3 pill suggestions emitted by the
-- model alongside each assistant turn so they survive reload and can be
-- rendered as interactive pills (web) or inline bullets (WhatsApp).

ALTER TABLE "ChatMessage"
  ADD COLUMN "followUps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
