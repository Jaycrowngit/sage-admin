export type Role = "student" | "tutor" | "admin";
export type ExamType = "practice" | "live";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

/** Laravel LengthAwarePaginator JSON shape */
export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
};

export type CourseRef = {
  id: string;
  name: string;
  code?: string;
};

export type Course = CourseRef & {
  category?: string | null;
  description?: string | null;
  is_active?: boolean;
  exams_count?: number;
  created_at?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  bio?: string | null;
  created_at?: string;
  courses?: CourseRef[];
  total_attempts?: number;
  passed_attempts?: number;
  created_exams_count?: number;
};

export type Exam = {
  id: string;
  title: string;
  description?: string | null;
  course_id?: string;
  course?: Course | null;
  creator?: { id: string; name: string; email?: string } | null;
  type: ExamType;
  duration_minutes: number;
  total_marks?: number;
  pass_percentage?: number;
  is_published?: boolean;
  shuffle_questions?: boolean;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  questions_count?: number;
  is_live_active?: boolean;
  created_at?: string;
};

export type QuestionOption = {
  id?: string;
  option_letter: string;
  option_text: string;
  is_correct: boolean;
};

export type Question = {
  id: string;
  question_text: string;
  explanation?: string | null;
  marks: number;
  order?: number;
  options: QuestionOption[];
};

/** Payload format accepted by the question store/update/bulk endpoints */
export type QuestionPayload = {
  question_text: string;
  explanation?: string;
  marks?: number;
  order?: number;
  options: { letter: string; text: string; is_correct: boolean }[];
};

export type Attempt = {
  id: string;
  exam_id?: string;
  user_id?: string;
  score: number;
  total_possible: number;
  percentage: number;
  passed: boolean;
  correct_answers_count?: number;
  incorrect_answers_count?: number;
  unanswered_count?: number;
  started_at?: string;
  submitted_at?: string;
  user?: { id: string; name: string; email: string; phone?: string | null } | null;
  exam?: {
    id: string;
    title: string;
    type: ExamType;
    course_id?: string;
    pass_percentage?: number;
    course?: CourseRef | null;
  } | null;
};

export type Dashboard = {
  total_students: number;
  total_tutors: number;
  total_courses: number;
  total_exams: number;
  practice_exams_count: number;
  live_exams_count: number;
  total_attempts_completed: number;
  overall_pass_rate: number;
  recent_attempts: Attempt[];
  recent_students?: Pick<User, "id" | "name" | "email" | "created_at">[];
};

export type UserDetail = User & {
  stats?: {
    total_attempts: number;
    passed_attempts: number;
    failed_attempts: number;
    average_percentage: number;
    best_percentage: number;
  };
  recent_attempts?: Attempt[];
  created_exams?: Exam[];
};

export type ExamSubmissions = {
  exam: {
    id: string;
    title: string;
    type: ExamType;
    course?: string | null;
    total_marks?: number;
    pass_percentage?: number;
  };
  stats: {
    total_submissions: number;
    average_score: number;
    average_percentage: number;
    highest_score: number;
    pass_count: number;
  };
  submissions: Paginated<Attempt>;
};

export type AnswerBreakdown = {
  question_id: string;
  question_text: string;
  explanation?: string | null;
  marks: number;
  marks_awarded: number;
  is_correct: boolean;
  selected_option: { id: string; letter: string; text: string } | null;
  correct_option: { id: string; letter: string; text: string } | null;
};

export type ResultDetail = {
  attempt: {
    id: string;
    exam_id?: string;
    exam_title?: string | null;
    course?: string | null;
    exam_type?: ExamType | null;
    student?: { id: string; name: string; email: string; phone?: string | null } | null;
    score: number;
    total_possible: number;
    percentage: number;
    passed: boolean;
    correct_answers_count: number;
    incorrect_answers_count: number;
    unanswered_count: number;
    started_at?: string;
    submitted_at?: string;
  };
  answers: AnswerBreakdown[];
};

export type ExportRecord = {
  attempt_id: string;
  student_name: string;
  student_email: string;
  student_phone: string;
  course: string;
  course_code: string;
  exam_title: string;
  exam_type: string;
  score: number;
  total_possible: number;
  percentage: number;
  pass_percentage: number;
  passed: string;
  correct_answers: number;
  incorrect_answers: number;
  unanswered: number;
  submitted_at: string | null;
};
