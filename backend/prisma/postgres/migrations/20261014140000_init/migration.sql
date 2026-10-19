-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodEntry" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodEntryTag" (
    "moodEntryId" TEXT NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "MoodEntryTag_pkey" PRIMARY KEY ("moodEntryId","tagId")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tagId" INTEGER,
    "minScore" INTEGER,
    "maxScore" INTEGER,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodEntryAnswer" (
    "moodEntryId" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,

    CONSTRAINT "MoodEntryAnswer_pkey" PRIMARY KEY ("moodEntryId","optionId")
);

-- CreateTable
CREATE TABLE "TeamAction" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "location" TEXT,

    CONSTRAINT "TeamAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySubmission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "week" TEXT NOT NULL,

    CONSTRAINT "WeeklySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyCheckin" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "week" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "workload" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,

    CONSTRAINT "WeeklyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "teamId" INTEGER NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER,
    "accessTokenHash" TEXT,
    "requesterReadAt" TIMESTAMP(3),
    "handlerReadAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "handlerId" INTEGER,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "meetingId" INTEGER,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMeeting" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "CaseMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_label_key" ON "Tag"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_userId_date_key" ON "Submission"("userId", "date");

-- CreateIndex
CREATE INDEX "MoodEntry_teamId_date_idx" ON "MoodEntry"("teamId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Question_key_key" ON "Question"("key");

-- CreateIndex
CREATE INDEX "TeamAction_teamId_createdAt_idx" ON "TeamAction"("teamId", "createdAt");

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

-- CreateIndex
CREATE INDEX "CaseMeeting_caseId_idx" ON "CaseMeeting"("caseId");

-- CreateIndex
CREATE INDEX "CaseMeeting_status_startsAt_idx" ON "CaseMeeting"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodEntry" ADD CONSTRAINT "MoodEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodEntryTag" ADD CONSTRAINT "MoodEntryTag_moodEntryId_fkey" FOREIGN KEY ("moodEntryId") REFERENCES "MoodEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodEntryTag" ADD CONSTRAINT "MoodEntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodEntryAnswer" ADD CONSTRAINT "MoodEntryAnswer_moodEntryId_fkey" FOREIGN KEY ("moodEntryId") REFERENCES "MoodEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodEntryAnswer" ADD CONSTRAINT "MoodEntryAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodEntryAnswer" ADD CONSTRAINT "MoodEntryAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuestionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAction" ADD CONSTRAINT "TeamAction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySubmission" ADD CONSTRAINT "WeeklySubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyCheckin" ADD CONSTRAINT "WeeklyCheckin_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CaseMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMeeting" ADD CONSTRAINT "CaseMeeting_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

