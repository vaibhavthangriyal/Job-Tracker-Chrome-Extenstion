# Job Tracker

Monorepo for a Job Application Tracker with:

- NestJS API (`apps/api`)
- Next.js dashboard (`apps/web`)
- Chrome extension capture client (`apps/extension`)
- Shared TypeScript contracts (`packages/shared-types`)

## Features

### Authentication & Security

- Signup/login with JWT access + refresh tokens
- Cookie-based web session support
- CSRF protection for cookie-authenticated mutating requests
- Refresh-token rotation with reuse detection and session revocation
- Logout and session verification endpoints

### Applications Management

- Create, list, update, and delete job applications
- Search/filter/sort/pagination on applications list
- Status tracking (`Saved`, `Applied`, `Interview`, `Offer`, etc.)
- Track location, work mode, platform, notes, tags, and dates
- Duplicate-prevention check on create

### Resume Intelligence

- Upload resume files (`.pdf`, `.txt`, `.md`, `.text`)
- Parse and store resume profile:
  - total experience
  - key skills
  - preferred locations
  - preferred work mode
- Set active resume and manually edit parsed profile values

### Job Fit Scoring

- Analyze extracted/manual job details against selected resume
- Score breakdown by:
  - skills fit
  - experience fit
  - location/work-mode fit
- Rating output:
  - `Strong Match`
  - `Good Match`
  - `Weak Match`
  - `Not Recommended`
- Reason list explaining the match result
- Color-coded match result badges in dashboard and extension popup

### Chrome Extension

- Login/signup directly in popup
- Auto-detect authenticated session and show job form automatically
- Content-script job extraction with site-specific parsers + fallback parser
- Extracts company/title/location/work mode/description/skills/technologies
- Save application directly to backend
- Analyze fit from popup using selected resume

### Dashboard (Next.js)

- Login page with session-aware access
- Applications table with inline status updates
- Resume upload and profile editing UI
- Fit analysis panel with score, rating, color coding, and reasons

## 1) Install

```bash
npm install
```

## 2) Environment

Create `apps/api/.env`:

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/job-tracker
JWT_SECRET=replace-me
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=replace-me-refresh
JWT_REFRESH_EXPIRES_IN=30d
COOKIE_SECURE=false
WEB_ORIGIN=http://localhost:3000
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## 3) Run

API:

```bash
npm run dev:api
```

Web dashboard:

```bash
npm run dev:web
```

API tests:

```bash
npm test --workspace @job-tracker/api
npm run test:e2e --workspace @job-tracker/api
```

## 4) Chrome Extension

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select `apps/extension`

In the popup, set API URL and login with your email/password to connect.

## API Endpoints

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/csrf`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me` (Bearer token or cookie)
- `POST /applications`
- `GET /applications`
- `GET /applications/:id`
- `PATCH /applications/:id`
- `DELETE /applications/:id`
- `POST /resumes/upload`
- `GET /resumes`
- `PATCH /resumes/:id/activate`
- `PATCH /resumes/:id/profile`
- `POST /match/score`

Cookie session notes:

- Web app uses httpOnly auth cookies and a double-submit CSRF token (`jt_csrf` cookie + `x-csrf-token` header).
- Refresh token rotation is enabled; detected refresh token reuse revokes the refresh session.

Resume fit notes:

- Resume upload supports PDF and text files (`.pdf`, `.txt`, `.md`, `.text`).
- Fit scoring combines skills, years of experience, and location/work-mode alignment.
