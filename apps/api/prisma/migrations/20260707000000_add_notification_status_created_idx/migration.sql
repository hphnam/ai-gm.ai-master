-- Cross-org scan for the daily unread-notes email digest (status = 'unread'
-- AND createdAt in window) — none of the existing indexes cover it; they all
-- lead with organizationId.
CREATE INDEX "notifications_status_createdAt_idx" ON "notifications"("status", "createdAt");
