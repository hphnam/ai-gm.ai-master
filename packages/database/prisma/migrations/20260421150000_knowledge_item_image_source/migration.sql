-- Plan 04-01 Task 3 — image-via-Claude-vision source persistence (audit-S3 Option A committed).
-- Additive nullable columns; zero risk against existing rows (all retain NULL until a new image
-- upload writes them). D-04-01-F: migrate to object storage when aggregate bytes > 2GB or
-- NeonDB backup time regresses.

-- AlterTable
ALTER TABLE "knowledge_items" ADD COLUMN "sourceImageBytes" BYTEA,
ADD COLUMN "sourceImageMime" TEXT;
