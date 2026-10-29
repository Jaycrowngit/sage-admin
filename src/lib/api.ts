/**
 * Sage Admin - API Client
 * Talks to the same Laravel backend as the main Sage Academic frontend.
 */

import type {
  ApiResponse,
  Attempt,
  Course,
  Dashboard,
  Exam,
  ExamSubmissions,
  ExportRecord,
  Paginated,
  Question,
  QuestionPayload,
  ResultDetail,
  Role,
  User,
  UserDetail,
} from "./types";

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const base = envUrl || "https://sage-endpoint.onrender.com/api";
  const normalized = base.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

// Separate key from the student site so both apps can be open on the same machine.
const TOKEN_KEY = "sage_admin_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

type QueryValue = string | number | boolean | null | undefined;

function withQuery(endpoint: string, params?: Record<string, QueryValue>): string {
  if (!params) return endpoint;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }
  const qs = search.toString();
  return qs ? `${endpoint}?${qs}` : endpoint;
}

async function request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}/${endpoint.replace(/^\//, "")}`;
  const response = await fetch(url, { ...options, headers });

  let json: Record<string, unknown> | null = null;
  const text = await response.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text || `HTTP ${response.status}` };
  }

  if (!response.ok) {
    // Expired / revoked token: send the admin back to sign in.
    if (response.status === 401 && token && typeof window !== "undefined") {
      removeAuthToken();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.replace("/login");
      }
    }

    const errors = json?.errors as Record<string, string[]> | undefined;
    const fieldMessages = errors && typeof errors === "object" ? Object.values(errors).flat().filter(Boolean) : [];
    const message =
      fieldMessages.length > 0
        ? fieldMessages.join(" ")
        : (json?.message as string) || (json?.error as string) || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errors);
  }

  return json as ApiResponse<T>;
}

const send = (method: "POST" | "PUT" | "DELETE", body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export type UserPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  phone?: string | null;
  bio?: string | null;
  course_ids?: string[];
};

export type CoursePayload = {
  name: string;
  code: string;
  category?: string | null;
  description?: string | null;
  is_active?: boolean;
};

export type ExamPayload = {
  title: string;
  description?: string | null;
  course_id: string;
  type: "practice" | "live";
  duration_minutes: number;
  total_marks?: number;
  pass_percentage?: number;
  is_published?: boolean;
  shuffle_questions?: boolean;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
};

export type ResultFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  type?: string;
  passed?: string;
  course_id?: string;
  exam_id?: string;
};

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>("auth/login", send("POST", { email, password })),
  me: () => request<{ user: User }>("auth/me"),
  logout: () => request<null>("auth/logout", send("POST")),
  updateProfile: (payload: { name?: string; phone?: string; bio?: string; password?: string }) =>
    request<User>("auth/profile", send("PUT", payload)),
  /** `avatar` is a data URL produced by imageFileToAvatar(). */
  uploadAvatar: (avatar: string) => request<User>("auth/avatar", send("POST", { avatar })),
  removeAvatar: () => request<User>("auth/avatar", send("DELETE")),

  // Overview
  dashboard: () => request<Dashboard>("admin/dashboard"),

  // People
  students: (params: { page?: number; per_page?: number; search?: string; course_id?: string } = {}) =>
    request<Paginated<User>>(withQuery("admin/students", params)),
  staff: (params: { page?: number; per_page?: number; search?: string; role?: "tutor" | "admin" | "all" } = {}) =>
    request<Paginated<User>>(withQuery("admin/tutors", params)),
  user: (id: string) => request<UserDetail>(`admin/users/${id}`),
  createUser: (payload: UserPayload) => request<User>("admin/users", send("POST", payload)),
  updateUser: (id: string, payload: UserPayload) => request<User>(`admin/users/${id}`, send("PUT", payload)),
  deleteUser: (id: string) => request<null>(`admin/users/${id}`, send("DELETE")),

  // Courses (active_only=0 so the admin also sees deactivated courses)
  courses: () => request<Course[]>("courses?active_only=0"),
  createCourse: (payload: CoursePayload) => request<Course>("admin/courses", send("POST", payload)),
  updateCourse: (id: string, payload: Partial<CoursePayload>) =>
    request<Course>(`admin/courses/${id}`, send("PUT", payload)),
  deleteCourse: (id: string) => request<null>(`admin/courses/${id}`, send("DELETE")),

  // Exams
  exams: (params: { page?: number; per_page?: number; type?: string; course_id?: string } = {}) =>
    request<Paginated<Exam>>(withQuery("exams", params)),
  exam: (id: string) => request<Exam>(`exams/${id}`),
  createExam: (payload: ExamPayload) => request<Exam>("tutor/exams", send("POST", payload)),
  updateExam: (id: string, payload: Partial<ExamPayload>) => request<Exam>(`tutor/exams/${id}`, send("PUT", payload)),
  deleteExam: (id: string) => request<null>(`tutor/exams/${id}`, send("DELETE")),

  // Questions
  questions: (examId: string) =>
    request<{ exam: Pick<Exam, "id" | "title" | "type" | "total_marks">; questions: Question[] }>(
      `tutor/exams/${examId}/questions`
    ),
  addQuestion: (examId: string, payload: QuestionPayload) =>
    request<Question>(`tutor/exams/${examId}/questions`, send("POST", payload)),
  bulkAddQuestions: (examId: string, questions: QuestionPayload[]) =>
    request<{ count: number; questions: Question[] }>(
      `tutor/exams/${examId}/questions/bulk`,
      send("POST", { questions })
    ),
  updateQuestion: (questionId: string, payload: QuestionPayload) =>
    request<Question>(`tutor/questions/${questionId}`, send("PUT", payload)),
  deleteQuestion: (questionId: string) => request<null>(`tutor/questions/${questionId}`, send("DELETE")),
  submissions: (examId: string, page = 1) =>
    request<ExamSubmissions>(withQuery(`tutor/exams/${examId}/submissions`, { page, per_page: 25 })),

  // Results
  results: (filters: ResultFilters = {}) => request<Paginated<Attempt>>(withQuery("admin/results", filters)),
  exportResults: (filters: ResultFilters = {}) =>
    request<{ total_records: number; generated_at: string; records: ExportRecord[] }>(
      withQuery("admin/results/export", { ...filters, page: undefined, per_page: undefined })
    ),
  result: (attemptId: string) => request<ResultDetail>(`admin/results/${attemptId}`),
};
