# ReadEase — Antigravity Build Prompt Pack

Project root: `C:\Users\saroj\projects\ReadEase`
Design source: your **ReadEase** project in Google Stitch (already connected via MCP)
Stack (from the build plan): React + TypeScript + Vite → Node.js/Express + TypeScript → MongoDB, with a separate Python + FastAPI service for CV/AI.

Run these prompts **in order**, one at a time, in the Antigravity Agent chat, inside a workspace rooted at `C:\Users\saroj\projects\ReadEase`. Don't paste the whole file at once — each numbered prompt is one agent turn. Wait for it to finish and review the diff before moving to the next.

Every prompt below already bakes in MNC-grade engineering practices (scalability, security, performance, accessibility) specific to what that step is building, so you don't have to remember to ask for them separately.

---

## Phase 0 — Project Scaffolding

### 0.1 Repo & workspace structure

```
Scaffold a monorepo at the current workspace root for a project called ReadEase with this exact structure:

ReadEase/
  client/        (React + TypeScript + Vite frontend)
  server/        (Node.js + Express + TypeScript backend)
  ai-service/    (Python + FastAPI computer-vision/AI service)
  docs/
  docker-compose.yml
  .github/workflows/  (CI/CD)
  .env.example
  README.md

Use pnpm workspaces (or npm workspaces if pnpm isn't available) so client and server can share TypeScript types via a shared package later. Initialize git with a proper .gitignore for Node, Python, and environment files. Do not commit any real secrets — .env.example only, with placeholder values and comments explaining each variable.
```

### 0.2 Tooling & code quality baseline

```
Set up production-grade tooling across client and server:
- ESLint + Prettier with a shared config, TypeScript strict mode enabled everywhere (noImplicitAny, strictNullChecks).
- Husky + lint-staged pre-commit hooks that run lint, type-check, and tests on staged files.
- Commitlint with Conventional Commits.
- A root package.json script "validate" that runs lint + typecheck + test across all workspaces.
This is what MNC engineering orgs use to keep a codebase consistent as it scales past one contributor — set it up now before real feature code exists, not after.
```

### 0.3 Environment & secrets strategy

```
Create a documented environment-variable strategy: .env.example files for client, server, and ai-service listing every required variable (MongoDB URI, JWT secret, JWT refresh secret, LLM API key, MongoDB Atlas Vector Search config, CORS allowed origins, NODE_ENV, PORT, rate-limit config). Add a startup validation step in the Express server (using zod) that fails fast with a clear error if any required env var is missing, instead of failing silently at runtime.
```

---

## Phase 1 — Design System Import (Stitch → React)

### 1.1 Pull the design tokens first

```
Use the Stitch MCP connection to fetch the ReadEase project's design tokens (colors, typography scale, spacing scale, border radius, shadow levels) from Stitch. Generate a client/src/styles/design-tokens.ts file and a matching tailwind.config.ts theme extension so every screen we build afterward pulls from this single source of truth instead of hardcoded hex values. Include the dyslexia-friendly type scale (Lexend/Atkinson Hyperlegible, 16-18px minimum body size, 1.6-1.8 line-height) and the warm cream/indigo/amber/sage color system from the Stitch design.
```

### 1.2 Base layout shell

```
Fetch the navbar, footer, and authenticated-role sidebar layouts from the Stitch ReadEase project and convert them into reusable React + TypeScript components using Tailwind (client/src/layouts/). Build: PublicLayout (top nav + footer), AuthenticatedLayout (left sidebar + top bar, role-aware nav items for Student/Teacher/Special Educator/Parent/Admin). Use CSS Grid for the shell so it stays performant with no layout shift. Include a skip-to-content link and proper landmark roles (nav, main, aside) for accessibility.
```

### 1.3 Shared component library

```
Fetch the button, card, input, modal, badge, and alert/disclaimer components from the Stitch ReadEase design and build them as a reusable component library at client/src/components/ui/. Each component must: accept a `className` override, forward refs, have full keyboard focus states, use the design tokens from step 1.1, and include TypeScript prop types with JSDoc comments. This becomes the foundation every page below is built from — don't let individual pages redefine buttons/cards ad hoc.
```

---

## Phase 2 — Backend Foundation (secure & scalable by default)

### 2.1 Express + TypeScript API skeleton

```
Build the server/ Express + TypeScript API skeleton following this structure from the ReadEase build plan:
server/src/controllers, models, routes, middleware, services/auth, services/assessment, services/chatbot, services/rag, services/reports, validators.

Set up:
- Helmet for secure HTTP headers (CSP, HSTS, X-Frame-Options).
- CORS restricted to explicit allowed origins from env config, not "*".
- express-rate-limit on all routes, with a stricter limit on /api/auth/*.
- Centralized error-handling middleware that never leaks stack traces to the client in production.
- Request logging with pino or winston, structured JSON logs (needed for real observability, not console.log).
- Compression middleware (gzip/brotli) for all responses.
- A health-check endpoint GET /api/health for uptime monitoring/load balancers.
```

### 2.2 MongoDB connection & data model

```
Set up the MongoDB connection using Mongoose with a connection pool (maxPoolSize configured, not default), retry-on-startup logic, and graceful shutdown handling. Then create Mongoose schemas for all collections from the ReadEase data model: users, teacherProfiles, studentProfiles, specialEducatorProfiles, parentProfiles, readingSessions, aiInsights, passages, badges, notifications, chatConversations, knowledgeDocuments, knowledgeChunks.

Add indexes on every field used in lookups/filters (email on users, teacherId on studentProfiles, studentId+date on readingSessions, etc.) — this is the difference between a query that scales and one that falls over past a few thousand documents. Use schema-level validation (required fields, enums for role/status) so bad data can't reach the database even if the API layer has a bug.
```

### 2.3 Authentication & RBAC

```
Implement authentication for ReadEase:
- Password hashing with bcrypt (cost factor 12).
- JWT access tokens (short-lived, 15 min) + refresh tokens (httpOnly, secure, sameSite=strict cookies, 7-day expiry) with a rotation + revocation strategy (store refresh token hashes, not raw tokens, in the DB).
- Role-based middleware for the five roles: Student, Teacher, Special Educator, Parent, Admin — reject at the middleware layer before any controller logic runs.
- Server-side enforcement of: PENDING teachers cannot access student-management endpoints; a teacher cannot exceed 20 active students (use a MongoDB transaction to check-and-create atomically, avoiding race conditions); special educators can only access explicitly assigned students; parents can only access their linked child's data.
- Endpoints: POST /api/auth/register/teacher, POST /api/auth/login, POST /api/auth/forgot-password, POST /api/auth/reset-password, POST /api/auth/refresh, POST /api/auth/logout.

Every one of these authorization rules must be enforced server-side even though the UI also hides unauthorized actions — never trust the client.
```

---

## Phase 3 — Frontend Pages (Stitch design → wired React pages)

Run one prompt per page. Each fetches that screen's design from Stitch and wires it to the real backend built above.

### 3.1 Public pages

```
Fetch the Landing, About, Features, Contact/Support, and FAQ page designs from the Stitch ReadEase project and build them as React + TypeScript pages using the shared component library and layouts from Phase 1. Use React Router with lazy-loaded route-level code splitting (React.lazy + Suspense) so the public bundle stays small. Optimize all images: serve via <picture> with WebP + fallback, add explicit width/height to avoid layout shift, and lazy-load below-the-fold images. Add proper meta tags (title, description, Open Graph) per page for SEO.
```

### 3.2 Authentication pages

```
Fetch the Login, Teacher Registration, Forgot Password, Reset Password, and Teacher Verification Status page designs from Stitch and build them, wired to the auth endpoints from Phase 2.3. Use React Hook Form + Zod for validation (client-side validation must mirror server-side validation rules exactly). Show clear loading and error states. Store the access token in memory (not localStorage) and rely on the httpOnly refresh cookie — this avoids XSS token theft, which is the standard MNC pattern for JWT storage.
```

### 3.3 Student pages

```
Fetch the Student Dashboard, Reading Practice, Reading Assessment, Dyslexia-Friendly Reader, Assessment Result, Progress, Achievements, AI Assistant, Reading Preferences, and Profile page designs from the Stitch ReadEase project. Build them as React + TypeScript pages under a protected /student route group (require Student role). Wire to: GET /api/student/dashboard, GET /api/student/passages, POST /api/student/sessions, GET /api/student/progress. Reader settings (font, spacing, overlay color, bionic mode) must persist to the user's profile so they carry across sessions. Charts (Progress page) should use Recharts with lazy-loaded chart bundles so the dashboard route doesn't pull in charting code.
```

### 3.4 Teacher pages

```
Fetch the Teacher Dashboard, Students, Student Profile, Assessments, Analytics, Alerts, Special Educators, Invite/Assign Educator, Reports, AI Assistant, Notifications, and Settings page designs from Stitch. Build them under a protected /teacher route group. Wire to: GET /api/teacher/dashboard, GET /api/teacher/students, POST /api/teacher/students, POST /api/teacher/educators/invite, POST /api/teacher/educators/:id/assign. The 20-student capacity meter must reflect the real server-enforced count. Use optimistic UI updates for quick actions (add student, invite educator) with rollback on failure, and virtualized lists (react-window) for the Students table if the list is long, so it stays smooth at scale.
```

### 3.5 Special Educator & Parent pages

```
Fetch the Special Educator Dashboard, Assigned Students, Student Profile, Intervention Plans, Notes, Reports, AI Assistant, Profile designs, and the Parent Dashboard, Child Progress, Sessions, Reports, Alerts, AI Assistant, Profile designs from Stitch. Build both under their respective protected route groups (/educator, /parent), enforcing that educators only see assigned students and parents only see their linked child, matching the backend authorization from Phase 2.3.
```

### 3.6 Admin pages

```
Fetch the Admin Dashboard, Teacher Verification, Teachers, Students, Special Educators, Parents, Platform Analytics, Reports, RAG Knowledge Base, AI/Chatbot Settings, Notifications, and System Settings page designs from Stitch. Build them under a protected /admin route group requiring the Admin role, wired to GET /api/admin/teachers/pending, PATCH /api/admin/teachers/:id/approve, PATCH /api/admin/teachers/:id/reject, PATCH /api/admin/users/:id/suspend, and the RAG endpoints from Phase 5. Add an audit-log view showing recent admin actions — standard practice for any admin panel that can suspend users or approve accounts.
```

---

## Phase 4 — AI/CV Service (Python + FastAPI)

### 4.1 FastAPI service skeleton

```
Build the ai-service/ FastAPI application following this structure: app/routes, app/services/gaze, app/services/analysis, app/services/tts, app/main.py. Set up:
- Pydantic models for strict request/response validation.
- CORS restricted to the Express server's origin only (this service should never be called directly from the browser).
- A shared-secret or JWT check so only the authenticated Express backend can call this service, not the public internet.
- Async endpoints (async def) so frame-processing requests don't block the event loop.
- Structured logging and a /health endpoint.
```

### 4.2 Gaze estimation & reading analysis

```
Implement the webcam gaze estimation pipeline in ai-service/app/services/gaze using OpenCV + MediaPipe: accept a stream of frames (or periodic snapshots) from POST /api/assessment/frame, estimate fixation points, detect regressions (backward eye movement) and skipped words, and accumulate session metrics. Process frames in a background task queue (not inline in the request) so the API stays responsive under load — this is the pattern MNCs use for any CPU-heavy inference: keep the request/response cycle fast, do heavy work asynchronously and report status/results separately.
```

### 4.3 AI scoring & bilingual TTS

```
Implement reading-difficulty scoring in ai-service/app/services/analysis that produces a low/medium/high screening indicator from the session metrics, always paired with a stored disclaimer field ("screening aid, not a clinical diagnosis"). Implement app/services/tts for Malayalam + English text-to-speech with word/syllable timing metadata for synchronized highlighting on the frontend. Cache generated TTS audio (keyed by passage+language+voice) instead of regenerating on every playback request.
```

---

## Phase 5 — AI Chatbot & RAG

### 5.1 RAG ingestion pipeline

```
Implement the RAG pipeline in server/src/services/rag: document upload → text extraction → cleaning → chunking (with overlap) → embedding generation → storage in MongoDB Atlas Vector Search. Wire to POST /api/admin/rag/documents, GET /api/admin/rag/documents, DELETE /api/admin/rag/documents/:id, POST /api/admin/rag/reindex. Validate uploaded file type and size before processing (reject anything outside an explicit allow-list) and process ingestion as a background job so a large document upload doesn't block the request.
```

### 5.2 Role-aware chatbot

```
Implement the chatbot in server/src/services/chatbot: user question → query embedding → vector retrieval → role-aware prompt construction → LLM call → response with source citations. Enforce role-based context restriction at the query-construction layer (Student gets student-safe context, Teacher only their own students' data, Special Educator only assigned students, Parent only their linked child, Admin gets system-wide access) — the same authorization rules from Phase 2.3 must apply here too, since a chatbot is a new attack surface for data leakage if not scoped correctly. Wire to POST /api/chat, GET /api/chat/conversations, GET /api/chat/conversations/:id. Stream the LLM response token-by-token to the frontend (Server-Sent Events or streaming fetch) so the chat feels fast instead of waiting for a full response.
```

### 5.3 AI Assistant frontend

```
Fetch the AI Assistant chatbot UI design from Stitch and build it wired to the streaming chat endpoints above: conversation sidebar, message stream with streaming token rendering, source-citation cards, suggested prompts, read-aloud response, copy/regenerate actions, Malayalam/English mode. Debounce/throttle any typing-triggered requests and show an optimistic "sending" state immediately on submit.
```

---

## Phase 6 — Reports & Dashboards Data Layer

### 6.1 PDF report generation

```
Implement server-side PDF report generation (student progress, teacher class summary) using a library like pdf-lib or Puppeteer-based HTML-to-PDF, wired to a Reports page with report type, date range, and student selectors, preview, generate, download, and history. Generate reports as a background job for anything covering a large date range, and notify the user (via the notifications collection) when it's ready, rather than blocking the request.
```

### 6.2 Dashboard analytics endpoints

```
Implement the aggregation endpoints backing the Admin, Teacher, Special Educator, and Parent dashboards using MongoDB aggregation pipelines (not in-memory JS loops over fetched documents — that doesn't scale). Add short-TTL caching (Redis if available, or in-memory LRU cache as a fallback) on expensive aggregate queries like platform-wide analytics, since dashboards are read far more often than the underlying data changes.
```

---

## Phase 7 — Performance Pass (do this after core features work)

```
Run a full performance pass on the client:
- Analyze the production bundle (vite-bundle-visualizer or similar) and code-split anything over 100KB that isn't needed on first paint.
- Add route-based lazy loading for every authenticated section (student/teacher/educator/parent/admin) so a Student never downloads Admin code.
- Set proper cache headers on static assets (immutable, long max-age with content hashing) and short/no-cache on the HTML shell.
- Add a service worker for offline-friendly static asset caching (Workbox), especially useful for the reader UI on unstable school-network connections.
- Verify Core Web Vitals (LCP, CLS, INP) in Lighthouse and fix anything scoring below "Good" — this is the actual bar MNC frontend teams hold themselves to before shipping.
```

---

## Phase 8 — Security Hardening Pass

```
Run a full security pass across client and server:
- Confirm every protected route has server-side authorization (not just hidden in the UI) by attempting each role's forbidden actions against another role's token.
- Add input sanitization against NoSQL injection (mongo-sanitize) and XSS (sanitize any user-generated text rendered as HTML, e.g. teacher notes).
- Confirm file upload endpoints (verification docs, RAG documents) validate MIME type by content inspection, not just file extension, and store uploads outside the web root with randomized filenames.
- Add CSRF protection for cookie-based auth flows.
- Run `npm audit` / `pip-audit` across all three services and fix or document any high-severity vulnerabilities.
- Confirm secrets are never logged, even in error messages, and .env files are excluded from git history.
```

---

## Phase 9 — Testing & CI/CD

```
Set up automated testing and CI:
- Backend: Jest + Supertest for API integration tests covering the authorization rules from Phase 2.3 (teacher capacity limit, role-scoped data access) as explicit test cases, not just happy paths.
- Frontend: Vitest + React Testing Library for component tests, and Playwright for a few critical end-to-end flows (login, complete an assessment, teacher approves a student).
- GitHub Actions workflow (.github/workflows/ci.yml) that runs lint, typecheck, and tests on every PR, and blocks merge on failure.
- A separate deploy workflow that builds Docker images for client/server/ai-service on merge to main.
```

---

## Phase 10 — Deployment

```
Finalize docker-compose.yml to orchestrate client (served via Nginx), server, ai-service, and MongoDB for local/staging use. Write a production Dockerfile for each service using multi-stage builds (separate build and runtime stages) to keep final image size small. Document the deployment steps for a cloud target (Render, Railway, or a VPS) including environment variable setup, MongoDB Atlas connection, and HTTPS/TLS termination. Add a basic uptime/error-monitoring hook (e.g. a Sentry DSN placeholder) so errors in production are visible instead of silent.
```

---

## How to use this file day-to-day

1. Open Antigravity, workspace = `C:\Users\saroj\projects\ReadEase`.
2. Go phase by phase, prompt by prompt — don't skip ahead to Phase 3 before Phase 2's auth/RBAC exists, since every page prompt assumes those endpoints are real.
3. After each prompt, actually read the diff and run the app before moving on. If something looks wrong, correct it in that same turn rather than letting errors compound into the next phase.
4. Keep `ReadEase_Complete_Website_Build_Plan.docx` and `ReadEase_Google_Stitch_Prompt.md` open/referenced in the workspace so the agent can check itself against the original spec when a prompt is ambiguous.
