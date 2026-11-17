-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "Feedback_title_idx" ON "Feedback" USING GIN ("title" gin_trgm_ops);
