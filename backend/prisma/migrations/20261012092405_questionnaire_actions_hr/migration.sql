-- CreateTable
CREATE TABLE "Question" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tagId" INTEGER,
    "minScore" INTEGER,
    "maxScore" INTEGER,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Question_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "questionId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoodEntryAnswer" (
    "moodEntryId" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,

    PRIMARY KEY ("moodEntryId", "optionId"),
    CONSTRAINT "MoodEntryAnswer_moodEntryId_fkey" FOREIGN KEY ("moodEntryId") REFERENCES "MoodEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MoodEntryAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MoodEntryAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuestionOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamAction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teamId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamAction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_key_key" ON "Question"("key");

-- CreateIndex
CREATE INDEX "TeamAction_teamId_createdAt_idx" ON "TeamAction"("teamId", "createdAt");
