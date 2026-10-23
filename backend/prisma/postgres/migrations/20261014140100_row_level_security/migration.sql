-- Supabase publie chaque table du schéma public via son API REST (rôles anon et
-- authenticated, avec la clé publique du projet). Moodly n'utilise pas cette API :
-- seule l'API Express y accède, avec le rôle propriétaire des tables, qui n'est pas
-- soumis à ces règles. On active la sécurité au niveau des lignes SANS aucune
-- politique : l'API REST de Supabase ne peut ni lire ni écrire quoi que ce soit.

ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoodEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoodEntryTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoodEntryAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklySubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyCheckin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseMeeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
