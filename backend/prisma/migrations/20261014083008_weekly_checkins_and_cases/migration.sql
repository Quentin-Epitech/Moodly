-- CreateTable
CREATE TABLE "WeeklySubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "week" TEXT NOT NULL,
    CONSTRAINT "WeeklySubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyCheckin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" INTEGER NOT NULL,
    "week" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "workload" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    CONSTRAINT "WeeklyCheckin_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Case" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "teamId" INTEGER NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER,
    "accessTokenHash" TEXT,
    "requesterReadAt" DATETIME,
    "handlerReadAt" DATETIME,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Case_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "caseId" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "handlerId" INTEGER,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseMessage_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySubmission_userId_week_key" ON "WeeklySubmission"("userId", "week");

-- CreateIndex
CREATE INDEX "WeeklyCheckin_teamId_week_idx" ON "WeeklyCheckin"("teamId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "Case_accessTokenHash_key" ON "Case"("accessTokenHash");

-- CreateIndex
CREATE INDEX "Case_teamId_recipient_status_idx" ON "Case"("teamId", "recipient", "status");

-- CreateIndex
CREATE INDEX "Case_recipient_status_idx" ON "Case"("recipient", "status");

-- CreateIndex
CREATE INDEX "Case_authorId_idx" ON "Case"("authorId");

-- CreateIndex
CREATE INDEX "CaseMessage_caseId_createdAt_idx" ON "CaseMessage"("caseId", "createdAt");
