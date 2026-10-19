import { request } from './client';
import type {
  AgendaItem,
  AnonymousCaseSummary,
  CaseDetail,
  CaseStatus,
  CaseSummary,
  CaseTypeInfo,
  ChangePasswordBody,
  CreateCaseBody,
  CreateCaseResponse,
  CompanyOverview,
  CreateActionBody,
  HealthResponse,
  LoginBody,
  LoginResponse,
  MoodTodayResponse,
  Question,
  Session,
  SubmitMoodBody,
  Slot,
  SubmitMoodResponse,
  Tag,
  TeamAction,
  TeamInsights,
  TeamMoodReport,
  TeamWeeklyReport,
  User,
  WeeklyBody,
  WeekStatus,
} from './types';

export { ApiError, errorMessage, setAuthToken, setUnauthorizedHandler } from './client';
export * from './types';

/** 'me' = l'équipe du token (manager / employé) ; un id = vue RH */
export type TeamRef = number | 'me';

// Une fonction par endpoint du contrat (backend/API.md). Aucun fetch ailleurs.
export const api = {
  login: (body: LoginBody) => request<LoginResponse>('/auth/login', { method: 'POST', body, auth: false }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  getMe: () => request<User>('/me'),
  changePassword: (body: ChangePasswordBody) => request<Session>('/me/password', { method: 'POST', body }),
  getTags: () => request<Tag[]>('/tags'),
  getQuestions: () => request<Question[]>('/questions'),

  getMoodToday: () => request<MoodTodayResponse>('/moods/today'),
  submitMood: (body: SubmitMoodBody) => request<SubmitMoodResponse>('/moods', { method: 'POST', body }),

  getTeamMoods: (days = 30, team: TeamRef = 'me') => request<TeamMoodReport>(`/teams/${team}/moods?days=${days}`),
  getTeamInsights: (days = 30, team: TeamRef = 'me') => request<TeamInsights>(`/teams/${team}/insights?days=${days}`),
  getTeamActions: (team: TeamRef = 'me') => request<TeamAction[]>(`/teams/${team}/actions`),
  createTeamAction: (body: CreateActionBody) => request<TeamAction>('/teams/me/actions', { method: 'POST', body }),
  deleteTeamAction: (id: number) => request<void>(`/teams/me/actions/${id}`, { method: 'DELETE' }),

  getOverview: (days = 30) => request<CompanyOverview>(`/teams/overview?days=${days}`),

  getWeekStatus: () => request<WeekStatus>('/checkins/week'),
  submitWeekly: (body: WeeklyBody) => request<{ submitted: true }>('/checkins', { method: 'POST', body }),
  getTeamWeekly: (weeks = 12, team: TeamRef = 'me') =>
    request<TeamWeeklyReport>(`/teams/${team}/weekly?weeks=${weeks}`),

  getCaseTypes: () => request<CaseTypeInfo[]>('/cases/types'),
  listCases: () => request<CaseSummary[]>('/cases'),
  getUnreadCases: () => request<{ count: number }>('/cases/unread'),
  createCase: (body: CreateCaseBody) => request<CreateCaseResponse>('/cases', { method: 'POST', body }),
  lookupCases: (tokens: string[]) =>
    request<AnonymousCaseSummary[]>('/cases/lookup', { method: 'POST', body: { tokens } }),
  getCase: (id: number, token?: string) =>
    request<CaseDetail>(`/cases/${id}`, { headers: token ? { 'X-Case-Token': token } : undefined }),
  replyCase: (id: number, body: string, token?: string) =>
    request<CaseDetail>(`/cases/${id}/messages`, {
      method: 'POST',
      body: { body },
      headers: token ? { 'X-Case-Token': token } : undefined,
    }),
  setCaseStatus: (id: number, status: CaseStatus) =>
    request<CaseDetail>(`/cases/${id}/status`, { method: 'POST', body: { status } }),
  proposeMeeting: (caseId: number, slot: Slot) =>
    request<CaseDetail>(`/cases/${caseId}/meetings`, { method: 'POST', body: slot }),
  respondMeeting: (id: number, response: 'ACCEPT' | 'DECLINE') =>
    request<CaseDetail>(`/meetings/${id}/respond`, { method: 'POST', body: { response } }),
  cancelMeeting: (id: number) => request<CaseDetail>(`/meetings/${id}/cancel`, { method: 'POST' }),

  getAgenda: () => request<AgendaItem[]>('/agenda'),

  health: () => request<HealthResponse>('/health', { auth: false }),
};
