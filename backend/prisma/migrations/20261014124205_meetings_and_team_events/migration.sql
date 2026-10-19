-- AlterTable
ALTER TABLE "TeamAction" ADD COLUMN "durationMin" INTEGER;
ALTER TABLE "TeamAction" ADD COLUMN "eventAt" DATETIME;
ALTER TABLE "TeamAction" ADD COLUMN "location" TEXT;

-- CreateTable
CREATE TABLE "CaseMeeting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "caseId" INTEGER NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    CONSTRAINT "CaseMeeting_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CaseMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "caseId" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "handlerId" INTEGER,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "meetingId" INTEGER,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseMessage_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseMessage_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CaseMeeting" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CaseMessage" ("body", "caseId", "createdAt", "handlerId", "id", "sender") SELECT "body", "caseId", "createdAt", "handlerId", "id", "sender" FROM "CaseMessage";
DROP TABLE "CaseMessage";
ALTER TABLE "new_CaseMessage" RENAME TO "CaseMessage";
CREATE INDEX "CaseMessage_caseId_createdAt_idx" ON "CaseMessage"("caseId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CaseMeeting_caseId_idx" ON "CaseMeeting"("caseId");

-- CreateIndex
CREATE INDEX "CaseMeeting_status_startsAt_idx" ON "CaseMeeting"("status", "startsAt");
