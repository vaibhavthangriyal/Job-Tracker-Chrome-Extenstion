# Agent.md

## Project

Build a **Chrome Extension + backend service** to track job applications automatically.

The product should help the user:
- auto-capture job details from job portals when they apply
- manually add applications if auto-capture is not possible
- store all applications in **MongoDB**
- view all saved applications in a **table format**
- update status over time (Applied, Interview, Rejected, Offer, etc.)

---

## Core Goal

Create a job application tracker with two main parts:

1. **Chrome Extension**
   - detects supported job pages
   - extracts job information from the current page
   - allows the user to save the application
   - allows manual job entry
   - optionally detects when the user has just submitted an application

2. **Web App / Backend API**
   - stores all job applications in MongoDB
   - exposes CRUD APIs
   - shows applications in a searchable, filterable table

---

## High-Level Features

### 1. Auto Fetch Job Details
When the user is on a job posting or application confirmation page, the extension should try to extract:
- company name
- job title
- job location
- employment type
- salary, if available
- job URL
- source platform (LinkedIn, Indeed, Greenhouse, Lever, company site, etc.)
- application date
- job description, if available
- recruiter/contact details, if visible
- application status (default: `Applied`)

### 2. Manual Add Job
The extension and/or dashboard should allow the user to manually add an application with editable fields.

### 3. MongoDB Storage
All applications should be stored in MongoDB.

### 4. Table View
The dashboard must show all applications in a table with:
- sorting
- filtering
- searching
- pagination
- inline status update

### 5. Status Tracking
Support status values like:
- Saved
- Applied
- OA
- Interview
- HR Round
- Rejected
- Offer
- Accepted
- Withdrawn

### 6. Notes and Follow-ups
The user should be able to add:
- notes
- follow-up date
- referral status
- salary expectation
- contact person

---

## Recommended Tech Stack

### Frontend
- **Chrome Extension Manifest V3**
- **React** for popup/options/dashboard frontend
- **TypeScript**
- **Tailwind CSS** for UI
- **TanStack Table** for table rendering

### Backend
- **Node.js**
- **Express** or **NestJS**
- **MongoDB** with **Mongoose**

### Auth
- simple email/password auth or magic link
- use JWT for API auth

### Hosting
- frontend dashboard: Vercel / Netlify
- backend: Render / Railway / Fly.io / AWS
- MongoDB: MongoDB Atlas

---

## Architecture

### Chrome Extension Modules

#### 1. Content Script
Responsibilities:
- inspect DOM of job pages
- extract job information
- identify supported sites
- send parsed data to background script or popup

#### 2. Background Service Worker
Responsibilities:
- manage message passing
- communicate with backend API
- handle auth token storage
- trigger notifications

#### 3. Popup UI
Responsibilities:
- show extracted job details
- allow edit before save
- allow manual entry
- save application
- show quick recent applications

#### 4. Options Page
Responsibilities:
- connect user account
- configure supported job sites
- manage preferences
- export/import data later if needed

### Backend Modules

#### 1. Auth Module
- signup/login
- token validation

#### 2. Applications Module
- create application
- get all applications
- get one application
- update application
- delete application
- bulk import/export later

#### 3. Parsing Metadata Module
Optional:
- maintain extraction rules for supported platforms
- store domain-specific selectors if needed

---

## Supported Capture Modes

### Mode A: Auto Extract from Job Page
When the user opens a job page, the extension should:
1. detect the site/domain
2. apply extraction rules
3. populate fields in popup
4. let user confirm and save

### Mode B: Capture on Apply Action
If feasible, detect a click on an `Apply` button or redirect to application confirmation pages.
This should be best-effort only, not guaranteed across all sites.

### Mode C: Manual Entry
User can click `Add Manually` and fill all fields.

---

## Recommended Data Model

### Application Collection

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  companyName: string,
  jobTitle: string,
  location: string,
  employmentType: string,
  workplaceType: string, // remote / hybrid / onsite
  salary: string,
  sourcePlatform: string,
  jobUrl: string,
  companyWebsite: string,
  jobDescription: string,
  recruiterName: string,
  recruiterEmail: string,
  recruiterLinkedIn: string,
  applicationDate: Date,
  status: string, // Saved | Applied | Interview | Rejected | Offer etc.
  notes: string,
  followUpDate: Date,
  referral: boolean,
  resumeVersion: string,
  coverLetterUsed: boolean,
  tags: string[],
  createdAt: Date,
  updatedAt: Date
}
```

### Optional Activity Log Collection

```ts
{
  _id: ObjectId,
  applicationId: ObjectId,
  type: string, // status_changed, note_added, followup_set
  message: string,
  createdAt: Date
}
```

---

## Suggested API Endpoints

### Auth
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`

### Applications
- `POST /applications`
- `GET /applications`
- `GET /applications/:id`
- `PATCH /applications/:id`
- `DELETE /applications/:id`

### Query Support for List API
`GET /applications` should support:
- `search`
- `status`
- `sourcePlatform`
- `companyName`
- `page`
- `limit`
- `sortBy`
- `sortOrder`

Example:
```bash
GET /applications?search=frontend&status=Applied&page=1&limit=20&sortBy=applicationDate&sortOrder=desc
```

---

## Table View Requirements

The application list page should show a table with columns like:
- Company
- Job Title
- Location
- Platform
- Applied Date
- Status
- Follow Up Date
- Notes
- Actions

### Table Features
- global search
- column filters
- status filter
- sorting
- pagination
- row click to open details drawer/page
- quick inline status change
- edit and delete actions

---

## Scraping / Extraction Strategy

### Important Principle
Do **not** hardcode only one site. Build a layered extraction strategy.

### Layer 1: Site-specific Parsers
Create site-specific extractors for:
- LinkedIn Jobs
- Indeed
- Greenhouse
- Lever
- Wellfound
- Naukri
- company career pages

Example structure:

```ts
interface JobExtractor {
  canHandle: (url: string) => boolean;
  extract: () => Partial<JobApplicationPayload>;
}
```

### Layer 2: Generic Fallback Parser
If no site-specific parser works:
- inspect common DOM patterns
- use meta tags
- inspect `h1`, `title`, structured data, and description blocks
- fallback to user editing extracted fields before save

### Layer 3: Manual Confirmation
Even when extracted automatically, always show editable fields before save.

---

## Example Extraction Targets

Try to extract from:
- page title
- first `h1`
- structured data (`application/ld+json`)
- Open Graph tags
- known company containers
- visible text blocks near apply buttons

Potential fields mapping:
- job title → `h1`, page title
- company → subtitle, metadata section
- location → job header metadata
- description → main content container
- source platform → from hostname
- job URL → `window.location.href`

---

## UX Requirements

### Popup Flow
1. User opens job page
2. Extension popup shows detected info
3. User edits if needed
4. Clicks `Save Application`
5. Data sent to backend
6. Toast shows success

### Manual Entry Flow
1. User opens popup
2. Clicks `Add Manually`
3. Fills form
4. Saves to backend

### Dashboard Flow
1. User logs in
2. Opens application dashboard
3. Sees all applications in table
4. Filters by status/platform/date
5. Updates notes or status

---

## Validation Rules

### Required Fields
At minimum, require:
- companyName
- jobTitle
- applicationDate
- status

### Nice-to-have Fields
- location
- platform
- jobUrl
- notes

### Duplicate Handling
Before creating a new record, check for likely duplicates using:
- same userId
- same companyName
- same jobTitle
- same jobUrl, if available

If duplicate found:
- warn user
- allow update instead of insert

---

## MongoDB / Mongoose Notes

### Suggested Schema Rules
- index on `userId`
- compound index on `(userId, applicationDate desc)`
- optional compound unique-ish index for duplicate prevention using app logic
- text index on companyName, jobTitle, notes

Example indexes:
```ts
applicationSchema.index({ userId: 1, applicationDate: -1 });
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ companyName: 'text', jobTitle: 'text', notes: 'text' });
```

---

## Security Requirements

- never expose MongoDB directly to the extension
- extension should talk only to backend API
- store JWT securely
- validate all input on backend
- sanitize scraped text
- rate limit APIs
- apply CORS restrictions

---

## MVP Scope

Build the first version with:
- signup/login
- Chrome extension popup
- auto extraction from current job page
- manual add form
- save to backend API
- MongoDB persistence
- web dashboard table view
- edit/delete application
- filter by status and search by company/title

---

## Post-MVP Ideas

- browser history based job detection
- reminders for follow-up dates
- email parsing for interview updates
- Kanban board view
- export CSV/Excel
- analytics dashboard
- AI enrichment of missing fields
- resume version tracking
- company-wise application stats

---

## Suggested Folder Structure

```bash
job-tracker/
  apps/
    extension/
      src/
        background/
        content/
        popup/
        options/
        lib/
        extractors/
    web/
      src/
        pages/
        components/
        hooks/
        api/
    api/
      src/
        modules/
          auth/
          applications/
        models/
        middleware/
        utils/
  packages/
    shared-types/
```

---

## Shared Types

```ts
export interface JobApplication {
  _id?: string;
  companyName: string;
  jobTitle: string;
  location?: string;
  employmentType?: string;
  workplaceType?: string;
  salary?: string;
  sourcePlatform?: string;
  jobUrl?: string;
  companyWebsite?: string;
  jobDescription?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedIn?: string;
  applicationDate: string;
  status: string;
  notes?: string;
  followUpDate?: string;
  referral?: boolean;
  resumeVersion?: string;
  coverLetterUsed?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Implementation Guidance for the Coding Agent

### Phase 1: Backend
Build backend first.

Deliverables:
- auth endpoints
- application schema
- CRUD endpoints
- MongoDB connection
- pagination/filter/search

### Phase 2: Dashboard Web App
Deliverables:
- login page
- applications table
- add/edit application form
- search/filter/sort

### Phase 3: Chrome Extension
Deliverables:
- popup UI
- content script extraction
- backend integration
- manual add support

### Phase 4: Extraction Rules
Deliverables:
- LinkedIn parser
- Indeed parser
- Greenhouse parser
- Lever parser
- generic parser fallback

---

## Product Behavior Rules

- always let the user edit auto-fetched data before saving
- never assume extraction is fully accurate
- do not block manual addition if extraction fails
- handle unsupported sites gracefully
- prefer clean, simple UX over overly complex automation

---

## Success Criteria

The project is successful if:
- user can save a job application from a live job page in under 10 seconds
- user can manually add an application in under 20 seconds
- all applications are stored in MongoDB
- dashboard shows applications in a clean table
- user can search, filter, and update status easily

---

## Nice UI Notes

### Popup
- compact
- clear extracted fields
- primary CTA: `Save Application`
- secondary CTA: `Add Manually`

### Dashboard
- modern clean table UI
- status badges with colors
- sticky filters/search
- row actions menu

---

## Prompt for the Coding Agent

Build a full-stack job application tracker consisting of a Chrome Extension (Manifest V3), a React-based web dashboard, and a Node.js backend with MongoDB.

Requirements:
- auto-extract job details from supported job pages using content scripts
- allow manual addition of jobs
- save all applications in MongoDB through backend APIs
- show all applications in a searchable, sortable, filterable table
- support edit, delete, and status updates
- use TypeScript across the stack where practical
- create a modular extraction system with site-specific parsers and a generic fallback
- ensure clean UX and production-friendly code structure

Start with the MVP and keep the architecture extensible.

---

## Final Instruction

Prioritize:
1. reliability
2. clean architecture
3. manual override support
4. simple and fast UX
5. scalable extraction design

Do not over-engineer the first version.
