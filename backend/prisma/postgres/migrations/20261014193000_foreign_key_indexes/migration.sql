-- CreateIndex
CREATE INDEX "User_teamId_idx" ON "User"("teamId");

-- CreateIndex
CREATE INDEX "MoodEntryTag_tagId_idx" ON "MoodEntryTag"("tagId");

-- CreateIndex
CREATE INDEX "Question_tagId_idx" ON "Question"("tagId");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- CreateIndex
CREATE INDEX "MoodEntryAnswer_questionId_idx" ON "MoodEntryAnswer"("questionId");

-- CreateIndex
CREATE INDEX "MoodEntryAnswer_optionId_idx" ON "MoodEntryAnswer"("optionId");

-- CreateIndex
CREATE INDEX "CaseMessage_handlerId_idx" ON "CaseMessage"("handlerId");

-- CreateIndex
CREATE INDEX "CaseMessage_meetingId_idx" ON "CaseMessage"("meetingId");

