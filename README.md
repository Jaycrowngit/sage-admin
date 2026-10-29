# SAGE Admin Panel

Standalone Next.js admin app for SAGE Educational Session. It talks to the **same Laravel backend** (`sage backend/`) as the student site (`sage academic/`), but is built, run and deployed on its own.

## Run locally

```bash
cd "sage admin"
npm install
npm run dev        # http://localhost:3001
```

The student site uses port 3000, so both can run at the same time.

## Configuration

`.env.local`:

```
NEXT_PUBLIC_API_URL=https://sage-endpoint.onrender.com/api
```

Point it at `http://localhost:8000/api` to use a local backend.

The backend must allow this app's origin in CORS. `localhost:3001` and any `*.vercel.app` domain are allowed by default. For any other domain, set `ADMIN_URL=https://your-admin-domain` in the backend `.env`.

## Sign in

Only accounts with the `admin` role can sign in. Other roles are rejected and their token is revoked. The seeded admin is `admin@sageacademic.com` (change its password after the first login).

The admin token is stored under its own key (`sage_admin_token`), separate from the student site's.

## Features

| Section | What you can do |
|---|---|
| Overview | Platform stats, pass rate, latest results, newest students |
| Students | Search, filter by course, paginate; create, edit (including course enrolment and password), delete; profile with performance and exam history |
| Tutors & Staff | List tutors and admins; create tutor or admin accounts; edit, change role, delete; see exams each tutor authored |
| Courses | Create, edit, activate or deactivate, delete (blocked while the course still has exams) |
| Exams | Practice and live exams with schedule, duration, total marks, pass mark, shuffle, publish toggle; filter by type or course |
| Questions | Add or edit questions with 2–6 options; bulk upload from CSV or JSON (same format as `python_service/sample_questions.*`) |
| Submissions | Per-exam ranking, stats and CSV export |
| Results | All results with search and course/type/pass filters; CSV export that uses the same filters; full per-question review of any attempt |
| Settings | Update your own profile and password |

## Backend endpoints added for this panel

- `POST /api/admin/users`: create a student, tutor or admin
- `GET /api/admin/users/{id}`: profile with stats, history or authored exams
- `PUT /api/admin/users/{id}`: update profile, role, courses or password
- `DELETE /api/admin/users/{id}`: delete the account along with the student's attempts
- `GET /api/admin/results/{attemptId}`: detailed review of an attempt
- `GET /api/admin/tutors?role=tutor|admin|all&search=`: staff listing
