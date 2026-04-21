-- Plan 04-03 Task 1 — procedural doc model.
-- 1) DocumentType gains `kind` (default 'reference' backfills existing rows).
-- 2) checklists (1-1 with knowledge_items, procedural-kind only).
-- 3) checklist_instances + checklist_step_completions (schema-only this plan; 04-04/05 wire).
--
-- Additive migration: no data touch beyond the DEFAULT backfill on document_types.kind.

ALTER TABLE "document_types"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'reference';

-- checklists: 1-1 with knowledge_items.
CREATE TABLE "checklists" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "knowledgeItemId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "steps" JSONB NOT NULL DEFAULT '[]',
  "schedule" JSONB NOT NULL DEFAULT '{}',
  "audience" JSONB NOT NULL DEFAULT '{}',
  "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "checklists_knowledgeItemId_key" ON "checklists"("knowledgeItemId");
CREATE INDEX "checklists_organizationId_idx" ON "checklists"("organizationId");
ALTER TABLE "checklists"
  ADD CONSTRAINT "checklists_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checklists"
  ADD CONSTRAINT "checklists_knowledgeItemId_fkey"
  FOREIGN KEY ("knowledgeItemId") REFERENCES "knowledge_items"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- checklist_instances: schema-only this plan (04-04 writer).
CREATE TABLE "checklist_instances" (
  "id" TEXT NOT NULL,
  "checklistId" TEXT NOT NULL,
  "instanceKey" TEXT NOT NULL,
  "openedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "completedBy" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "checklist_instances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "checklist_instances_checklistId_instanceKey_key" ON "checklist_instances"("checklistId", "instanceKey");
CREATE INDEX "checklist_instances_checklistId_idx" ON "checklist_instances"("checklistId");
ALTER TABLE "checklist_instances"
  ADD CONSTRAINT "checklist_instances_checklistId_fkey"
  FOREIGN KEY ("checklistId") REFERENCES "checklists"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- checklist_step_completions: schema-only this plan (04-05 writer).
CREATE TABLE "checklist_step_completions" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "stepIndex" INTEGER NOT NULL,
  "value" JSONB,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedBy" TEXT,
  CONSTRAINT "checklist_step_completions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "checklist_step_completions_instanceId_stepIndex_key" ON "checklist_step_completions"("instanceId", "stepIndex");
CREATE INDEX "checklist_step_completions_instanceId_idx" ON "checklist_step_completions"("instanceId");
ALTER TABLE "checklist_step_completions"
  ADD CONSTRAINT "checklist_step_completions_instanceId_fkey"
  FOREIGN KEY ("instanceId") REFERENCES "checklist_instances"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
