// Miroir du contrat d'API documenté dans backend/API.md.
// Le backend est la source de vérité : toute modification du contrat se reporte ici.

export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR';

export type User = {
  id: number;
  email: string;
  role: Role;
  teamName: string;
  /** Nombre minimal de réponses pour qu'un jour soit visible par le manager */
  anonymityThreshold: number;
  /** Mot de passe provisoire : à changer avant d'accéder au reste de l'app */
  mustChangePassword: boolean;
};

// POST /auth/login
export type LoginBody = { email: string; password: string };
export type LoginResponse = { token: string; user: User };

// POST /me/password → nouvelle session (les autres sont fermées)
export type ChangePasswordBody = { currentPassword: string; newPassword: string };
export type Session = LoginResponse;
/** Longueur minimale imposée par l'API */
export const MIN_PASSWORD_LENGTH = 10;

// GET /tags
export type Tag = { id: number; label: string };

// GET /questions
export type QuestionKind = 'single' | 'multi';
export type Question = {
  id: number;
  key: string;
  label: string;
  kind: QuestionKind;
  /** Posée seulement si cette raison est cochée (null = pas de condition) */
  tagId: number | null;
  /** Posée seulement si la note est dans [minScore, maxScore] */
  minScore: number | null;
  maxScore: number | null;
  options: { id: number; label: string }[];
};

// GET /moods/today
export type MoodTodayResponse = { submitted: boolean };

// POST /moods
export type MoodScore = 1 | 2 | 3 | 4 | 5;
export type AnswerInput = { questionId: number; optionIds: number[] };
export type SubmitMoodBody = { score: MoodScore; tagIds: number[]; answers: AnswerInput[] };
export type SubmitMoodResponse = { submitted: true };

// GET /teams/me/moods?days=30  (HR : GET /teams/:teamId/moods)
export type TagCount = { label: string; count: number };
export type DayStats = {
  /** "YYYY-MM-DD" */
  date: string;
  /** Moyenne des notes, null si le jour est masqué */
  avg: number | null;
  count: number;
  /** true si count < threshold : aucune donnée d'humeur pour ce jour */
  hidden: boolean;
  topTags: TagCount[];
};
export type Trend = 'up' | 'down' | 'flat';
export type AlertLevel = 'none' | 'watch' | 'alert';
export type TeamAlert = { level: AlertLevel; message: string; drivers: TagCount[] };
export type TeamSummary = {
  teamSize: number;
  responses: number;
  /** 0..1 */
  participation: number;
  avg7: number | null;
  avgPrev7: number | null;
  trend: Trend | null;
  distribution: { score: number; count: number }[];
  topTags: TagCount[];
  alert: TeamAlert;
};
export type TeamMoodReport = {
  teamId: number;
  teamName: string;
  threshold: number;
  days: DayStats[];
  summary: TeamSummary;
};

// GET /teams/me/insights?days=30  (HR : GET /teams/:teamId/insights)
export type OptionStat = { id: number; label: string; count: number; ratio: number };
export type QuestionInsight = {
  id: number;
  key: string;
  label: string;
  kind: QuestionKind;
  responses: number;
  options: OptionStat[];
};
export type TeamInsights = {
  teamId: number;
  teamName: string;
  threshold: number;
  days: number;
  basedOnDays: number;
  responses: number;
  questions: QuestionInsight[];
};

// Créneau d'un rendez-vous (demande ou point d'équipe)
export type Slot = {
  /** ISO 8601 (UTC) */
  startsAt: string;
  durationMin: number;
  location: string;
};

// /teams/me/actions  (HR : GET /teams/:teamId/actions)
/** event : rendez-vous d'équipe facultatif (« point jeudi 14 h ») */
export type TeamAction = { id: number; message: string; createdAt: string; event: Slot | null };
export type CreateActionBody = { message: string; event?: Slot };

// GET /teams/overview?days=30 (HR)
export type TeamOverview = {
  teamId: number;
  teamName: string;
  teamSize: number;
  responses: number;
  participation: number;
  avg7: number | null;
  avgPrev7: number | null;
  trend: Trend | null;
  alert: TeamAlert;
  visibleDays: number;
  hiddenDays: number;
  topTags: TagCount[];
  /** Moyenne par jour (null = masqué), du plus ancien au plus récent */
  series: (number | null)[];
  /** Bilan hebdomadaire de la dernière semaine close */
  weekly: { stats: WeekStats; alert: WeeklyAlert };
};
export type CompanyOverview = {
  threshold: number;
  days: number;
  dates: string[];
  company: {
    teams: number;
    employees: number;
    responses: number;
    participation: number;
    avg7: number | null;
    avgPrev7: number | null;
    trend: Trend | null;
    alerts: number;
  };
  teams: TeamOverview[];
};

// GET /checkins/week, POST /checkins, GET /teams/me/weekly (HR : /teams/:teamId/weekly)
export type WeekStatus = { week: string; submitted: boolean };
export type WeeklyBody = { score: MoodScore; workload: MoodScore; stress: MoodScore };
export type WeekStats = {
  /** Lundi de la semaine, "YYYY-MM-DD" */
  week: string;
  count: number;
  hidden: boolean;
  avgScore: number | null;
  avgWorkload: number | null;
  avgStress: number | null;
};
export type WeeklyAlert = { level: AlertLevel; message: string };
export type TeamWeeklyReport = {
  teamId: number;
  teamName: string;
  threshold: number;
  /** Semaines closes, de la plus ancienne à la semaine dernière */
  weeks: WeekStats[];
  alert: WeeklyAlert;
};

// /cases — demandes & signalements (nominatifs, sauf option anonyme)
export type CaseType = 'ACTION_REQUEST' | 'COLLEAGUE_ISSUE' | 'MANAGER_ISSUE' | 'CONTACT';
export type CaseRecipient = 'MANAGER' | 'HR';
export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type CaseTypeInfo = {
  type: CaseType;
  label: string;
  description: string;
  recipient: CaseRecipient | 'CHOICE';
  anonymousAllowed: boolean;
  categories: string[];
};
export type CaseSummary = {
  id: number;
  type: CaseType;
  typeLabel: string;
  category: string;
  subject: string;
  recipient: CaseRecipient;
  recipientLabel: string;
  status: CaseStatus;
  anonymous: boolean;
  teamName: string;
  /** Email du demandeur, seulement pour qui traite une demande nominative */
  requester: string | null;
  viewer: 'REQUESTER' | 'HANDLER';
  unread: boolean;
  createdAt: string;
  lastMessageAt: string;
};
export type CaseSide = 'REQUESTER' | 'HANDLER';
export type MeetingStatus = 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
export type Meeting = Slot & {
  id: number;
  status: MeetingStatus;
  proposedBy: CaseSide;
  /** Proposition de l'autre côté, à venir : accepter ou refuser */
  canRespond: boolean;
  /** Retirer sa proposition, ou annuler un rendez-vous accepté */
  canCancel: boolean;
};
export type MessageKind = 'TEXT' | 'MEETING_PROPOSED' | 'MEETING_ACCEPTED' | 'MEETING_DECLINED' | 'MEETING_CANCELLED';
export type CaseMessage = {
  id: number;
  sender: CaseSide;
  kind: MessageKind;
  /** État actuel du rendez-vous, pour un message MEETING_PROPOSED */
  meeting: Meeting | null;
  authorLabel: string;
  mine: boolean;
  body: string;
  createdAt: string;
};
export type CaseDetail = CaseSummary & { messages: CaseMessage[] };
export type CreateCaseBody = {
  type: CaseType;
  category: string;
  subject: string;
  message: string;
  anonymous: boolean;
  recipient?: CaseRecipient;
};
/** accessToken : code de suivi d'une demande anonyme, affiché une seule fois */
export type CreateCaseResponse = { case: CaseDetail; accessToken: string | null };
export type AnonymousCaseSummary = CaseSummary & { token: string };

// GET /agenda : prochains rendez-vous (demandes + points d'équipe)
export type AgendaMeeting = Meeting & {
  kind: 'MEETING';
  caseId: number;
  subject: string;
  /** « Ressources humaines », « Manager de l'équipe » ou l'email du demandeur */
  withLabel: string;
  recipient: CaseRecipient;
  viewer: CaseSide;
};
export type AgendaTeamEvent = Slot & { kind: 'TEAM_EVENT'; id: number; title: string; teamName: string };
export type AgendaItem = AgendaMeeting | AgendaTeamEvent;

// GET /health
export type HealthResponse = { ok: true };

// Toutes les erreurs
export type ApiErrorBody = { error: string };
