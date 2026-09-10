# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js 16.2.4 / React 19.2 / Tailwind 4 (PostCSS, no config) / Prisma 7 + Neon / next-auth v4 — existing codebase answers it; no new stack choice

## Users

- **Primary:** BSIS Student at Bulacan State University — joins via invitation code as `GUEST → STUDENT`, submits capstone topic → Chapters 1-5 → proposal/final defense → archiving, tracks progress via `CapstoneJourney`.
- **Primary:** BSIS Faculty at BulSU — joins via invitation code as `GUEST → FACULTY`, holds adviser / coordinator records, advises groups, opens milestones, schedules defenses.
- **Secondary:** Coordinator (faculty flag) — owns sections (`/faculty/my-sections/[sectionId]`), manages groups/students, unlocks milestones per `MilestoneAvailability` / `capstone1/2OpenedAt`.
- **Secondary:** Program Chair (faculty `isProgramChair` flag) — oversees all sections, workload, defenses, archiving; reads chair dashboard when built.
- **Admin/Superadmin** — user/section/template management, soft-delete.

## Product Purpose

**Archive** replaces the manual BSIS capstone workflow (Messenger, Google Drive, email) with a centralized Capstone Management System for the BSIS program at BulSU. From **topic → Chapters 1-5 → proposal defense → final defense → archiving**, everything lives in one place: in-PDF adviser feedback, versioned submissions, phase-gated milestone unlocking, and searchable repository (`CapstoneArchive`). Success = auditable, balanced, and searchable capstone lifecycle with no Drive links or Messenger threads.

## Positioning

The only capstone system that **phase-gates the entire BSIS journey** (`capstone1/2OpenedAt` + `MilestoneAvailability`) and keeps **in-PDF draft→committed annotations** per submission inside the same `CapstoneJourney` the student and coordinator both read — not a Drive folder with comments and not a generic LMS.

## Operating Context

- BSIS capstone lifecycle `docs/workflow/00-overview.md` → `01-coordinator-assignment` … `10-monitoring`; `proxy.ts` is single route guard, `TemplateDefault` (`Header/Footer/Drawer`) wraps public pages.
- Environments: Vercel (Next `cacheComponents:true`), Neon PostgreSQL (`DATABASE_URL` pooled), Vercel Blob (`BLOB_READ_WRITE_TOKEN`), Brevo SMTP; `APP_NAME` from `config/constants.ts`.
- Artifacts: capstone documents (PDF, Vercel Blob), `DefenseSchedule`/`DefenseSubmission` + `DefensePanelist`, `Topic`/`Capstone`/`Milestone` submissions, `CapstoneArchive` repository at `/repository`.
- Rituals: coordinator invites student via join code (`/guest/join-archive`), faculty via faculty code, adviser assignment, coordinator unlocks milestones per section, chair oversees.

## Capabilities and Constraints

- **Capabilities:** Role-based access (`GUEST/STUDENT/FACULTY/ADMIN/SUPERADMIN` + `Faculty` sub-roles), sections, groups (`GROUP_CAP 5`), topics (`TOPIC_CAP 3`), chapters 1-5, proposal/final defense, archiving → repository, in-PDF annotations (`SubmissionAnnotation`/`DefenseSubmissionAnnotation`), `CapstoneJourney` derivation via `lib/journey.ts`.
- **Constraints:** **BSIS-only, BulSU-only** — no social proof, no public vanity metrics; hero must stay simple. **No `isProgramChair` as role** — it's a flag. **Soft-delete mandatory** `deletedAt`. **next-auth v4 only**. **Prisma 7 + Neon adapter singleton**. `'use cache'` + `react cache()` not mixed. `@/` → repo root. Tailwind 4 no config. Password 12 rounds (10 seed). `proxy.ts` is edge, keep compute low.
- **Undecided:** Public hero copy beyond workflow promise; whether to show `APP_NAME` vs `ARCHIVE` wordmark;  image vs illustration for hero.

## Brand Commitments

- **Name:** `ARCHIVE` / `Archive` (`APP_NAME` in `config/constants.ts` still says `NextCrud` — stale, do not rename casually). BulSU + BSIS identity implied, no external brand.
- **Voice:** Simple, academic, workflow-first — “From topic to archiving, in one place.”
- **Assets:** None pinned beyond `Header`/`Footer`/`Drawer`, `APP_NAME`. Preserve `Sign In / Login` CTAs to `roleHome()` (`/student`, `/faculty`, `/admin`, `/guest`).

## Evidence on Hand

- Repo: `ARCHIVE-PROTOTYPE-UI` Figma `CeB1fsgwQxvh7CnSzSsriw` (node `747:6448` chair dashboard + milestone tabs already built on `feature/milestone-phase-gates`, `feature/student-milestone-overview`).
- Copy: `app/page.tsx` incumbent is demo boilerplate (“Next.js 15, Neon, Prisma, Tailwind V4”) — to be replaced; `business-domain.md` holds real workflow copy.
- Paths: `lib/journey.ts`, `types/milestones.ts`, `prisma/schema.prisma` (Section/MilestoneAvailability), `proxy.ts` (edge), `templates/Default.tsx`.

## Product Principles

1. **Workflow over vanity** — Show the next unlockable step, not counts for outsiders.
2. **Phase-gate is truth** — `capstone1/2OpenedAt` hard-gates the journey; UI overlay must match DB.
3. **Adviser feedback stays in doc** — In-PDF draft→committed annotations, not chat.
4. **Coordinator owns the section** — Unlocks, groups, and defense scheduling live where the coordinator works.
5. **BSIS-only, no theater** — Simple hero for BSIS BulSU, no social proof or external claims.

## Accessibility & Inclusion

- WCAG AA contrast, keyboard focus, `aria-label` on toggles, `prefers-reduced-motion` for journey animations; student/faculty range includes varied devices — keep hero and journey responsive `375/768/1024/1440` as in `ui-styling-standards.md`.
