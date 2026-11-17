-- Adds accounts (User, Session), project ownership, widget settings and
-- custom-field answers.
--
-- Hand-edited data migration: Project.ownerId is required, but projects
-- created before accounts existed have no owner. We add the column as
-- nullable, assign orphans to a demo user, THEN make it NOT NULL, so
-- existing data survives instead of forcing a DB reset.

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "answers" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Project" ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#ff5b2e',
ADD COLUMN "formFields" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "launcherText" TEXT NOT NULL DEFAULT 'Feedback',
ADD COLUMN "ownerId" TEXT,
ADD COLUMN "showDescription" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "titleLabel" TEXT NOT NULL DEFAULT 'Your idea',
ADD COLUMN "titlePlaceholder" TEXT NOT NULL DEFAULT 'e.g. Export reports to Excel',
ADD COLUMN "widgetSubtitle" TEXT NOT NULL DEFAULT 'Vote on ideas or suggest your own.',
ADD COLUMN "widgetTitle" TEXT NOT NULL DEFAULT 'Share feedback';

-- Backfill: give pre-existing projects to a demo account
-- (demo@shiplog.dev / demo12345). Only created if there are orphans.
INSERT INTO "User" ("id", "email", "name", "passwordHash")
SELECT 'user_demo', 'demo@shiplog.dev', 'Demo User',
       '50b41b5fc442392b1eaec061c3290f64:8d72b7ca194603fe6b9cbb39f52679d2415d22eb2aa04cd8685677c1bac4880769c217a94e4748a976d0a082c44c6fe27f09b87adbbe7d417b1ca589af91df48'
WHERE EXISTS (SELECT 1 FROM "Project");

UPDATE "Project" SET "ownerId" = 'user_demo' WHERE "ownerId" IS NULL;

ALTER TABLE "Project" ALTER COLUMN "ownerId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
