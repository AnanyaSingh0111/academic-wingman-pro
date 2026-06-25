
# CampusPilot AI — Build Plan (v1)

A Midnight Aurora SaaS for college students. Phase 1 ships a polished, real, working product; phase 2 (Career Assistant, Analytics Center, Placement Hub) layered after.

## Design system

- Theme: deep navy `#0B0F1E` base, violet `#7C3AED` + cyan `#22D3EE` gradient accents, glassmorphic cards, soft aurora glows.
- Dark-first with proper light mode tokens.
- Typography: Space Grotesk (display) + Inter (body).
- Tokens defined in `src/styles.css` (oklch) — gradients, glass surface, glow shadows, semantic shadcn vars.
- Motion: tasteful fade/scale-in, animated aurora blobs on landing, hover-lift cards.

## Backend (Lovable Cloud)

Tables (RLS scoped to `auth.uid()`):
- `profiles` (id, full_name, avatar_url, college, branch, year, xp, level, streak)
- `subjects` (id, user_id, name, color, target_attendance)
- `attendance_records` (id, user_id, subject_id, date, status)
- `assignments` (id, user_id, subject_id, title, description, due_date, priority, status)
- `exams` (id, user_id, subject_id, title, exam_date, syllabus, readiness)
- `notes` (id, user_id, subject_id, title, content, file_url, tags, summary, flashcards jsonb)
- `study_tasks` (id, user_id, title, subject_id, scheduled_for, duration_min, completed)
- `resumes` (id, user_id, file_url, version, ats_score, suggestions jsonb, created_at)
- `chat_threads` + `chat_messages` (AI Doubt Solver history)
- `achievements` (id, user_id, code, earned_at)

Auth: email/password + Google (default per Cloud guidance). Profile auto-created via trigger. `user_roles` table + `has_role` for future admin.

Storage buckets: `notes-files` (private), `resumes` (private), `avatars` (public).

## AI (Lovable AI Gateway, gemini-3-flash-preview)

Server functions:
- `chat.ts` route — streaming Doubt Solver chat with `useChat`.
- `summarize-note.functions.ts` — summary + flashcards + important Qs (structured `Output`).
- `analyze-resume.functions.ts` — ATS score, missing skills, suggestions.
- `generate-study-plan.functions.ts` — weekly plan from exams + subjects.

## Routes

Public:
- `/` Landing (hero with aurora, features, stats, testimonials, pricing, FAQ, CTA, footer)
- `/auth` Sign in / sign up (email + Google)

Protected (`_authenticated/` layout with sidebar shell):
- `/dashboard` — welcome, KPI cards (productivity, placement readiness, streak, XP/level), exam countdowns, today's tasks, recent activity, attendance ring
- `/planner` — calendar + drag-friendly task list + AI "Generate plan" button
- `/notes` — grid of notes, upload, AI summary panel, flashcards viewer
- `/attendance` — subjects, mark present/absent, charts, "classes needed" calc
- `/assignments` — Kanban (todo/in-progress/done) + list/calendar toggle
- `/exams` — countdown cards + readiness sliders + revision checklist
- `/doubt-solver` — chat threads sidebar + streaming chat
- `/resume` — upload + version list + ATS score gauge + suggestions
- `/settings` — profile, theme

## Gamification

- XP awarded on: marking attendance, completing assignment/task, finishing note summary. Level = floor(sqrt(xp/50)).
- Streak: consecutive days with ≥1 completed action.
- Achievements list with badge grid on dashboard.

## Tech notes

- TanStack Start file routes; `_authenticated/route.tsx` integration-managed.
- TanStack Query for all reads via `ensureQueryData` + `useSuspenseQuery`.
- AI Elements for Doubt Solver chat (conversation, message, prompt-input, tool, shimmer).
- Recharts for analytics widgets.
- All server fns use `requireSupabaseAuth`; bearer middleware via `attachSupabaseAuth`.

## Out of scope for v1 (phase 2)

Career Assistant, full Analytics Center, Placement Prep Hub, Leaderboards, Notification system (in-app reminders only via toasts), mock interviews, payment plans.

## Delivery order

1. Enable Cloud + AI key, design tokens, landing page, auth scaffolding.
2. Sidebar shell + dashboard + Attendance + Assignments + Exams (real CRUD).
3. Notes (+ upload + AI summary), Study Planner, Resume (+ AI ATS), Doubt Solver chat.
4. Gamification wiring + polish pass.

Confirm to proceed.
