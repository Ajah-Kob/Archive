# 📖 Archive

> A capstone management system for the BSIS program — one place for the whole lifecycle, from section setup through final defense.

Capstone work is usually scattered across Messenger threads, shared drives, and email. Adviser feedback lives in one place, the manuscript in another, and the defense date in a third. Archive replaces that with a single system that carries a student group and its faculty from topic selection to the repository, with every handoff recorded.

## The capstone lifecycle

The domain is the process itself, so the app is organised around it. Each step below has a workflow document in [`docs/workflow/`](docs/workflow/):

1. **Coordinator assignment** — the Program Chair assigns faculty to a section
2. **Section management** — sections, academic year, join codes, archiving
3. **Group management** — students form capstone groups inside a section
4. **Adviser assignment** — an adviser is attached to a group
5. **Capstone 1** — topic selection, Chapters 1–3, adviser review, proposal defense
6. **Capstone 2** — Chapters 4–5, final defense
7. **Progress monitoring** — chairs and coordinators track a whole program

## Roles

Access is role-scoped on the server, not just hidden in the UI.

| Role                   | Sees                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| `SUPERADMIN` / `ADMIN` | Everything, plus user management, the audit log, and section administration |
| `FACULTY`              | Scoped to their own groups and sections                                     |
| `STUDENT`              | Their own group, section, milestones, and repository                        |
| `GUEST`                | The join-by-invite-code flow only                                           |

Faculty carry sub-roles on top of the role, and each unlocks a different surface:

| Sub-role      | Unlocks                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| Program chair | Program-wide oversight, faculty and section management, workload monitoring |
| Coordinator   | Their sections: groups, students, milestones, templates                     |
| Adviser       | Document review for their advised groups                                    |

> [!NOTE]
> Sub-roles are flags on the `Faculty` record, not enum values. They reach the client as JWT claims, so a change can take up to a minute to appear — server actions re-check against the database, so permissions are never stale where it matters.

## Features

**Sections and people** — sections carry an academic year and a palette color, accept students by invite code, and can change coordinator without losing history. A section archives only when it is empty, and archiving releases its name for reuse. Coordinators are assigned directly, with an in-app notification rather than a pending invitation.

**Groups and milestones** — students form groups, pick a topic, and submit Chapters 1–3 and 4–5 against milestone windows the coordinator controls. Submissions are versioned, and every review is recorded with a reviewer and a note.

**Defense** — proposal and final defenses, scheduled with a venue and a panel by picking a slot on the shared calendar. Panelists review and record a verdict — approved, minor revision, major revision, or re-defense — and groups resubmit against the same defense, with a versioning flag separating the original from the revision. Students see their group's schedule in their milestone journey.

**Calendar** — a shared read surface for defenses and chair-created events, coloured from the same six-preset palette the section cards use. Timezone-safe: defense times are authored as Manila wall-clock and never shift with the host.

**Repository** — approved capstone output published with structured author records, searchable and filterable.

**Archiving and audit** — groups submit for review, the chair approves, and every business-critical mutation writes an audit row that admins can filter by actor, action, entity, and date.

## Tech stack

| Layer        | Choice                                          |
| ------------ | ----------------------------------------------- |
| Framework    | Next.js 16.2 (App Router, Turbopack)            |
| UI           | React 19, Tailwind CSS 4, MUI 9, Lucide, Sonner |
| Calendar     | FullCalendar 7                                  |
| Documents    | EmbedPDF 2.15 (WASM PDF viewing and annotation) |
| Auth         | NextAuth v4, Credentials provider, JWT sessions |
| Database     | Neon PostgreSQL via Prisma 7                    |
| Storage      | Vercel Blob                                     |
| Email        | Nodemailer + Brevo SMTP                         |
| Client state | Zustand 5                                       |
| Tests        | Jest 30                                         |

> [!NOTE]
> Exact pinned versions live in [`AGENTS.md`](AGENTS.md) for reproducible builds.

## Getting started

**Prerequisites**

- Node.js 22.14.x
- A Neon PostgreSQL database
- A Vercel account, for Blob storage and deployment

**Install and run**

```bash
git clone https://github.com/Ajah-Kob/Archive.git
cd Archive
npm install
vercel env pull .env.local     # or write .env.local by hand
npm run db:deploy              # apply migrations
npm run db:seed                # create the seeded accounts
npm run dev                    # http://localhost:3000
```

### Seeded accounts

All seeded accounts share the password `defaultpass`. They are for local development — change or remove them before any shared deployment.

| Email                                         | Role         | Sub-role      |
| --------------------------------------------- | ------------ | ------------- |
| `superadmin@domain.com`                       | `SUPERADMIN` | —             |
| `programchair@domain.com`                     | `FACULTY`    | Program chair |
| `coordinator@domain.com`                      | `FACULTY`    | Coordinator   |
| `student1@domain.com` … `student3@domain.com` | `GUEST`      | —             |

The seed also creates a section, a group, and a defense already carrying a revision verdict plus a pending resubmission, so the review and resubmission flows have data to exercise.

## Scripts

| Command                               | Purpose                                            |
| ------------------------------------- | -------------------------------------------------- |
| `npm run dev`                         | Dev server with Turbopack                          |
| `npm run build`                       | `prisma generate` then production build            |
| `npm run start`                       | Serve the production build                         |
| `npm run lint`                        | ESLint                                             |
| `npm test`                            | Jest                                               |
| `npm run db:deploy`                   | Apply pending migrations                           |
| `npm run db:migrate -- --name <name>` | Create and apply a migration                       |
| `npm run db:generate`                 | Regenerate the Prisma client                       |
| `npm run db:push`                     | Push schema without a migration (development only) |
| `npm run db:reset`                    | Drop, re-migrate, and re-seed                      |
| `npm run db:seed`                     | Seed accounts and fixtures                         |
| `npm run db:studio`                   | Open Prisma Studio                                 |

## Environment variables

Read from `.env.local`. Only the names matter here — never commit values.

| Variable                | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `DATABASE_URL`          | Pooled Neon connection, used at runtime        |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection, used by the Prisma CLI |
| `NEXTAUTH_SECRET`       | Signs the session JWT                          |
| `NEXTAUTH_URL`          | Base URL for auth callbacks                    |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob API token                          |
| `SMTP_HOST`             | Brevo SMTP host                                |
| `SMTP_KEY`              | Brevo SMTP API key                             |

## Project layout

```
app/                  # App Router routes, grouped by role root
  admin/              # users, sections, templates, audit
  faculty/            # my-sections, defense, document review, archiving
  student/            # milestones, my-team, templates
  account/            # profile, security (shared by every role)
  calendar/           # shared read surface
  api/                # NextAuth handler, Blob proxy
components/          # feature-scoped UI
lib/actions/          # server actions, one module per domain (incl. guard.ts)
lib/                  # domain logic, prisma singleton, auth, mailer
proxy.ts              # route protection: role roots + faculty sub-roles
prisma/               # schema, migrations, seed
docs/                 # workflow, permissions, glossary, context
templates/            # page shells (Main, Welcome, Blank, Default)
```

## Conventions worth knowing

**Soft delete is mandatory.** Nothing is hard-deleted; `deletedAt` is set instead, and every query for live records filters `deletedAt: null`. This is the single most common mistake to make in this codebase.

**Route protection lives in `proxy.ts`.** Next.js 16 proxy enforces role roots and faculty sub-roles from the JWT. Layouts only wrap templates — they do not guard. Server actions independently re-check authorization against the database on every call, so a stale token can never widen access.

> [!TIP]
> There are two caching mechanisms and they are not interchangeable. `'use cache'` is persistent and tag-based, used for list and detail reads. `react cache()` is per-request deduplication only, used by `getMe()`. Mixing them up produces either stale data or a cache that never persists.

**Sessions are JWTs with a 24-hour window that slides.** The client polls the session every 60 seconds, which reissues the cookie, so an open tab stays signed in. In practice you are signed out after 24 hours away from the app rather than 24 hours from signing in.

**Server actions never throw.** They return `{ success, message, payload? }` so forms can surface a message instead of an error boundary.

## Deployment

Set the build command to `prisma generate && next build` and add the environment variables in the Vercel dashboard. The Blob storage domain is allowlisted in `next.config.ts` for use with `next/image`.

## Further reading

| Document                                                       | Covers                                            |
| -------------------------------------------------------------- | ------------------------------------------------- |
| [`docs/01-project-overview.md`](docs/01-project-overview.md)   | What the system is and who uses it                |
| [`docs/03-user-roles.md`](docs/03-user-roles.md)               | Role and sub-role definitions                     |
| [`docs/04-business-rules.md`](docs/04-business-rules.md)       | Invariants the code must preserve                 |
| [`docs/08-permissions.md`](docs/08-permissions.md)             | Who can do what, per feature                      |
| [`docs/glossary.md`](docs/glossary.md)                         | Domain vocabulary                                 |
| [`docs/calendar-page-layout.md`](docs/calendar-page-layout.md) | Calendar design decisions                         |
| [`docs/workflow/`](docs/workflow/)                             | One document per lifecycle step                   |
| [`docs/context/`](docs/context/)                               | Feature context: defenses, documents, submissions |

## For AI agents

Read [`AGENTS.md`](AGENTS.md) before generating code here. It is the canonical reference for import paths, the caching rules, auth callback internals, and the conventions that are not obvious from the code — several of them exist because a plausible-looking implementation was already tried and reverted.

> [!NOTE]
> This project grew out of the `nextcrud` boilerplate, and a few names still carry that history (`package.json`, `config/constants.ts`). Treat them as inherited, not authoritative.