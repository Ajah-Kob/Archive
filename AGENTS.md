# AGENTS.md

Read this before making any changes. This is the canonical reference for AI agents working on this codebase. It is self-contained — do not assume knowledge from README.md.

---

## TL;DR — Don't Miss These

- **Soft-delete is mandatory.** Every `User` query needs `where: { deletedAt: null }`.
- **next-auth v4 only.** Do NOT use v5/Auth.js APIs.
- **Route protection lives in `proxy.ts`** (Next.js 16 proxy). Layouts only wrap templates — they do NOT guard. Server actions still DB-check authorization themselves.
- **Prisma 7 with Neon adapter.** Always use the singleton at `@/lib/prisma.ts`.
- **Two caching mechanisms** — do not confuse them:
  - `'use cache'` (persistent, tag-based) for list/detail reads
  - `react cache()` (per-request dedup) for `getMe()`
- **`@/` maps to repo root**, not `src/`.
- **Tailwind 4 has no config file.** Classes resolved via PostCSS.
- **Session update needs `update()` call on client** after `updateMe` mutation.
- **Password hashing:** 12 rounds in all server actions, 10 rounds in seed.
- **TypeScript strict mode is OFF** — do not add `!` assertions or defensive types.

---

## Project Identity

**Archive** — a Capstone Management System (CMS) for the Bachelor of Science in Information Systems (BSIS) program. It replaces the manual capstone workflow (Messenger, Drive, email) with a centralized platform for submitting capstone documents, getting adviser feedback, and tracking progress through the capstone lifecycle.

Deployed to Vercel. Data on Neon PostgreSQL. Media on Vercel Blob.

**Feature areas**

- **Role-based access** — `GUEST`, `STUDENT`, `FACULTY`, `ADMIN`, `SUPERADMIN`. Faculty hold adviser/coordinator records; Program Chair is a flag on `Faculty`, not a role.
- **Join by invitation code** — guests join as student or faculty via a code (`/guest/join-archive`).
- **Faculty & coordinator management** — invitations, adviser/coordinator assignment, workload caps (`ADVISER_CAP`); the workload-monitoring list lives at `/faculty/faculty-list`.
- **Sections** — coordinators own sections, students enroll; the overview is the admin/program-chair view (duplicated at `/admin/sections` and `/faculty/sections`), and the coordinator's own section workspace lives at `/faculty/my-section/[sectionId]`.
- **Templates** — capstone document templates (upload/remove), duplicated at `/admin/templates` and `/faculty/templates`.
- **Repository** — capstone repository at `/repository` (shared by any role).
- **Notifications** — in-app notification panel in the aside footer.
- **Admin** — user management at `/admin/users`; soft-delete.
- **Account** — profile/security shared by all roles at `/account/profile` and `/account/security`.

**Planned (aside nav placeholders, no pages yet):** Defense, Calendar.

**Workflow docs:** the complete capstone lifecycle — coordinator assignment → section management → group management → adviser assignment → Capstone 1 (topic, ch. 1–3, adviser review, proposal defense) → Capstone 2 (ch. 4–5, final defense) → progress monitoring — is documented in `docs/workflow/`. Start at `docs/workflow/00-overview.md`; each numbered file (`01-…`–`10-…`) details one business process.

> Repo caveat: grew out of the `nextcrud` boilerplate — `package.json`,
> `config/constants.ts`, and some docs still say "NextCrud". Treat those as
> stale; do not rename casually.

---

## Tech Stack (exact versions)

| Layer          | Package                                | Version                       |
|————————————————|————————————————————————————————————————|———————————————————————————————|
| Framework      | `next`                                 | 16.2.4                        |
| React          | `react` / `react-dom`                  | 19.2.x                        |
| Auth           | `next-auth`                            | 4.24.x                        |
| ORM            | `prisma` / `@prisma/client`            | 7.x                           |
| DB driver      | `@neondatabase/serverless`             | 1.x                           |
| Prisma adapter | `@prisma/adapter-neon`                 | 7.x                           |
| File storage   | `@vercel/blob`                         | 2.x                           |
| State          | `zustand`                              | 5.x                           |
| Email          | `nodemailer`                           | 7.x                           |
| Toasts         | `sonner`                               | 2.x                           |
| Icons          | `lucide-react`                         | 1.x                           |
| PDF viewing    | `@embedpdf/react-pdf-viewer`           | 2.15.x                        |
| PDF engine     | `@embedpdf/core` / `@embedpdf/engines` | 2.15.x                        |
| CSS            | `tailwindcss`                          | 4.x (PostCSS, no config file) |
| TypeScript     | `typescript`                           | 6.x                           |

**TypeScript strict mode is OFF** — `"strict": false` in tsconfig.

---

## Repository Layout

```
app/
  api/auth/[...nextauth]/route.ts   # NextAuth handler (GET + POST)
  dashboard/                         # Protected — requires session
    layout.tsx                       # Uses Dashboard template
    page.tsx                         # Dashboard home
    users/page.tsx                   # Paginated user management
    user/
      profile/page.tsx               # Edit own profile
      security/page.tsx              # Change own password
  login/                             # Public auth pages
  signup/
  forgot-password/
  reset-password/
  layout.tsx                         # Root layout (fonts, Sonner, Providers, HydrationZustand)
  providers.tsx                      # <SessionProvider>

components/
  forms/                             # Login, Signup, Profile, Security forms
  globals/                           # Header, Footer, Aside, Drawer
  users/UsersTable.tsx               # Paginated user table
  ButtonsAuth.tsx
  Icons.tsx
  ui/ButtonDrawer.tsx

config/
  constants.ts                       # APP_NAME, APP_BASE_URL, SMTP constants, USERS_PER_PAGE

lib/
  authOptions.ts                     # NextAuth config (Credentials, JWT, callbacks)
  prisma.ts                          # Prisma singleton with Neon adapter
  helper.tsx                         # isValidEmail()
  actions/
    user.ts                          # Admin user CRUD
    me.ts                            # Current user operations
    media.ts                         # Vercel Blob upload/delete
    util.ts                          # Password reset + email

prisma/
  schema.prisma                      # DB schema
  seed.ts                            # Seeds default admin
  migrations/

store/
  useAside.ts                        # Sidebar minimized (Zustand)
  useDrawer.ts                       # Mobile drawer open (Zustand)

templates/
  Default.tsx                        # Public: Header + main + Footer
  Dashboard.tsx                      # Protected: Aside + HeaderDashboard + main + Footer
  Blank.tsx                          # Auth pages: main only
  hydrationZustand.tsx               # SSR fix for Zustand

types/                               # Shared TypeScript types
```

---

## Database Schema

The Prisma schema at `prisma/schema.prisma` is the single source of truth for all models, relations, and enums. Read it before writing any query — do not rely on model definitions duplicated in this file.

Current models: `User`, `ResetPasswordToken`, `Faculty`, `Coordinator`, `Adviser`, `JoinCode`, `Invitation`, `Section`, `Student`, `Group`, `Topic`, `Capstone`, `Milestone`, `MilestoneSubmission`, `CapstoneArchive`, `Template`.

### Critical conventions

- **Always** query with `where: { deletedAt: null }` unless intentionally querying deleted users.
- Role enum: `SUPERADMIN`, `ADMIN`, `FACULTY`, `STUDENT`, `GUEST` (no `USER`). Adviser/coordinator/program-chair are `Faculty` records/flags, not enum values.
- Passwords: `bcrypt`, 12 rounds in server actions, 10 rounds in seed.

---

## Authentication

**Library:** NextAuth.js v4 (NOT v5 / Auth.js — APIs differ).
**Strategy:** Credentials provider, JWT sessions (no DB session table).
**Session max age:** 1 day.
**Sign-in page:** `/login`.

### Auth data flow (exact)

1. `FormLogin` calls `signIn('credentials', { email, password, redirect: false })`
2. NextAuth calls `authorize(credentials, req)` in `lib/authOptions.ts`:
   - `prisma.user.findFirst({ where: { email, deletedAt: null } })`
   - `bcrypt.compare(password, user.password)`
   - On success: `prisma.user.update({ where: { id }, data: { loggedInAt: new Date() } })`
   - Returns `{ id: user.id, name: user.name, email: user.email }` or `null`
3. `jwt` callback (`token.user = { id, name, email, image, role }`) — fetches full user from DB
4. `session` callback maps `token` fields to `session.user`
5. Client: `useSession()` — requires `<SessionProvider>` from `app/providers.tsx`
6. Server: `getServerSession(authOptions)` — redirect on failure

### Session update flow

When user updates their own profile (`updateMe` in `lib/actions/me.ts`), the client form calls `update()` from `next-auth/react`. The `jwt` callback checks `trigger === 'update'` and overwrites the token with `session.user` values.

### Server-side session access

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

const session = await getServerSession(authOptions)
if (!session?.user?.id) redirect('/login')
```

### Client-side session access

```typescript
'use client'
import { useSession } from 'next-auth/react'

const { data: session, update } = useSession()
```

---

## Server Actions

All actions: `'use server'`, in `lib/actions/`.

### Response shape

```typescript
{ success: boolean; message: string; payload?: any }
```

Form-bound actions accept `(_prevState: any, formData: FormData)`.

### user.ts — Admin CRUD

| Function                      | Signature                                               | Cache                           |
| ----------------------------- | ------------------------------------------------------- | ------------------------------- |
| `getUser(id)`                 | `async (id: number) => User \| null`                    | `'use cache'`, tag `user-${id}` |
| `getUsers(page?, perPage?)`   | `async (page?, perPage?) => { users, totalPages, ... }` | `'use cache'`, tag `users`      |
| `createUser(_prev, formData)` | mutation                                                | revalidates tag `users`         |
| `softDeleteUser(id)`          | `async (id: number)`                                    | revalidates tag `users`         |
| `updateUser(_prev, formData)` | mutation                                                | revalidates tag `users`         |

All queries filter `deletedAt: null`. `getUser` throws `NotFoundError` if no match.

### me.ts — Current user

| Function                            | Purpose                               | Cache                               |
| ----------------------------------- | ------------------------------------- | ----------------------------------- |
| `getMe()`                           | Fetch authenticated user              | `react cache()` (per-request dedup) |
| `updateMe(_prev, formData)`         | Update name/email/image               | mutation (client calls `update()`)  |
| `updateMePassword(_prev, formData)` | Verify current password, set new hash | mutation                            |

`getMe()` uses `react cache()` — NOT `'use cache'`. It is deduplicated per HTTP request only.

```typescript
import { cache } from 'react'

export const getMe = cache(async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null },
  })
})
```

### media.ts — File storage

| Function                                       | Purpose                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `uploadMedia(userId: number, imageFile: File)` | Uploads to Blob at `user/{userId}/{random}-{filename}`, returns URL |
| `deleteMedia(_prev, formData)`                 | Deletes blob URL from formData                                      |

Blob domain allowlisted in `next.config.ts`: `tosysoik0rjt4ojn.public.blob.vercel-storage.com`

### util.ts — Auth utilities

| Function                          | Purpose                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| `forgotPassword(_prev, formData)` | Creates `ResetPasswordToken`, sends email via Nodemailer/Brevo       |
| `resetPassword(_prev, formData)`  | Validates token, hashes new password (12 rounds), deletes used token |

---

## Caching Strategy

**Project config:** `cacheComponents: true` in `next.config.ts`.

### `'use cache'` — persistent, tag-based

For read queries that return list/detail data:

```typescript
'use server'
import {
  unstable_cacheTag as cacheTag,
  unstable_cacheLife as cacheLife,
} from 'next/cache'

export async function getUsers(page = 1, perPage = USERS_PER_PAGE) {
  'use cache'
  cacheTag('users')
  cacheLife('max')
  // ... prisma query
}
```

Invalidate after mutations:

```typescript
import { revalidateTag } from 'next/cache'
revalidateTag('users')
revalidateTag(`user-${id}`)
```

### `react cache()` — per-request dedup

For `getMe()` only. Lives for one HTTP request. Not shared across requests.

```typescript
import { cache } from 'react'
export const getMe = cache(async () => { ... })
```

**Do NOT mix up these two mechanisms.**

---

## State Management (Zustand)

Client-only UI state. Never stores server data.

| Store       | State                                      | Used by          |
| ----------- | ------------------------------------------ | ---------------- |
| `useAside`  | `minimized: boolean` + `toggleMinimized()` | Sidebar collapse |
| `useDrawer` | `isOpen: boolean` + `open()` + `close()`   | Mobile drawer    |

Wrap components reading Zustand state in `<HydrationZustand>` (from `templates/hydrationZustand.tsx`) to prevent SSR mismatch. Dashboard layout handles this at the template level.

---

## Routing & Templates

Routes are organized under role roots. `proxy.ts` is the single authority for
route protection (role isolation + sub-role checks from JWT flags). Layouts
only wrap templates — they do NOT guard.

| Route                                        | Protection (in `proxy.ts`)                     | Template             | Notes                                            |
| -------------------------------------------- | ---------------------------------------------- | -------------------- | ------------------------------------------------ |
| `/`                                          | Public                                         | `Default`            | Public landing                                   |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Public (redirect if authed via `proxy.ts`)     | `Blank`              | Auth pages                                       |
| `/admin`, `/admin/users`, `/admin/sections`, `/admin/templates` | role `SUPERADMIN`/`ADMIN`                       | `Main`               | Admin only                                       |
| `/faculty`, `/faculty/faculty-list`, `/faculty/sections`, `/faculty/templates` | admin or role `FACULTY` + sub-role flags | `Main` (full-bleed) | Workload monitoring, sections, templates         |
| `/faculty/evaluation`                        | `isAdviser` (advisers only)                    | `Main` (full-bleed)  | Adviser evaluation                               |
| `/faculty/my-section/[sectionId]`            | `isCoordinator`                                | `Main` (full-bleed)  | Coordinator section workspace                    |
| `/student`, `/student/milestone`, `/student/milestone/[milestone]` | role `STUDENT`                  | `Main` (full-bleed)  | Student capstone journey                         |
| `/guest`, `/guest/join-archive`              | role `GUEST`                                   | `Welcome`            | Guest join-by-invite-code flow                   |
| `/account/profile`, `/account/security`      | any signed-in user                             | `Main`               | Shared profile/security                          |
| `/repository`                                | none (any role)                                | `Main`               | Shared capstone repository                       |

`proxy.ts` (Next.js 16 proxy, not `middleware.ts`) reads the JWT via
`getToken()`, enforces role-root isolation, checks faculty sub-role flags
(`isProgramChair`, `isCoordinator`, `isAdviser`) for the shared faculty routes,
and redirects authed users away from `/login` via `roleHome(role)` in
`lib/helper.tsx`. Role/sub-role changes reflect in the token within ~60s (the
client session `refetchInterval`) — server actions compensate with instant
DB-backed guards.

### Pattern: adding a new protected page

```typescript
// 1) The page does NOT guard. It only needs the session for data.
// app/admin/something/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

export default async function SomethingPage() {
  const session = await getServerSession(authOptions)
  // fetch data, render
}
```

```typescript
// 2) Register the route in proxy.ts so only authorized roles reach it.
// proxy.ts
if (startsWithPath(pathname, '/admin') && !isAdmin(token.role)) {
  return NextResponse.redirect(new URL(roleHome(token.role), req.url))
}
```

### Pattern: adding a new server action

```typescript
'use server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

export async function myAction(_prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' }

  // ... logic

  return { success: true, message: 'Done' }
}
```

### Pattern: form with server action (client)

```typescript
'use client'
import { useActionState } from 'react'
import { myAction } from '@/lib/actions/something'

const [state, formAction, isPending] = useActionState(myAction, null)
```

### Pattern: querying active users

```typescript
await prisma.user.findMany({
  where: { deletedAt: null },
})
```

---

## Environment Variables

All from `.env.local` (pulled via `vercel env pull .env.local`).

| Variable                | Purpose                             |
| ----------------------- | ----------------------------------- |
| `DATABASE_URL`          | Pooled Neon — Prisma runtime        |
| `DATABASE_URL_UNPOOLED` | Direct Neon — Prisma CLI migrations |
| `NEXTAUTH_SECRET`       | JWT signing key                     |
| `NEXTAUTH_URL`          | Base URL for auth callbacks         |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob API token               |
| `SMTP_HOST`             | Brevo SMTP host                     |
| `SMTP_KEY`              | Brevo SMTP API key                  |

Derived constants in `config/constants.ts`: `APP_NAME`, `APP_BASE_URL`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`, `USERS_PER_PAGE`.

---

## Seed Defaults

```
email:    admin@domain.com
password: defaultpass
role:     SUPERADMIN
```

Run `npm run db:seed`. The seed script uses `new PrismaClient()` directly (not the singleton from `lib/prisma.ts`) because it runs outside Next.js runtime.

---

## Build & Deployment

- **Build command (Vercel):** `prisma generate && next build`
- **Dev:** `npm run dev` (Turbopack)
- **Server Actions body limit:** 2 MB (`next.config.ts`)
- **Node.js:** 22.14.x required

---

## React Conventions

Two Vercel skill sets govern how we write React components. Full rules live in `.agents/skills/`; this section is the quick-reference.

- **Composition Patterns** → `.agents/skills/vercel-composition-patterns/AGENTS.md`
- **React Best Practices** → `.agents/skills/vercel-react-best-practices/AGENTS.md`

### Component Architecture

- **No boolean prop proliferation.** Don't add `isEditing`, `isThread`, etc. to customize behavior. Use composition or explicit variant components instead.
- **Use compound components** for complex UI (modals, forms, cards). Shared state lives in a context provider; subcomponents read from it via `use()`.
- **Lift state into providers.** If two sibling components need the same state, move it to a provider above them — not prop-drilling or useEffect syncing.
- **Explicit variants > boolean modes.** `ThreadComposer` and `EditComposer` are better than `<Composer isThread isEditing />`.

### State Management

- **Decouple state from UI.** The provider is the only place that knows how state is managed (useState, Zustand, server sync). UI components consume the context interface.
- **Generic context interface.** Define `state`, `actions`, and `meta` parts. Any provider can implement the same interface.
- **Zustand for global UI state** (sidebar, drawer). React context for scoped component state (modals, forms).

### Performance (Critical)

- **No waterfalls.** Check cheap sync conditions before `await`. Use `Promise.all()` for independent async operations.
- **Server components by default.** Only add `'use client'` when the component needs interactivity (event handlers, hooks, browser APIs).
- **Dynamic imports for heavy components.** Use `next/dynamic` for large components not needed on initial render.
- **Authenticate server actions inside the action** — don't rely solely on middleware or page-level checks.

### Rendering

- **Hoist static JSX** outside components. Decorative elements, constants, and static markup should not re-render.
- **Conditional rendering with ternary**, not `&&` (avoids rendering `0` as empty).
- **No inline component definitions.** Define components outside the parent to avoid remounting on every render.

### React 19

- **No `forwardRef`.** `ref` is a regular prop in React 19.
- **`use()` instead of `useContext()`.** Can be called conditionally.

---

## Key Gotchas

1. **Soft deletes are mandatory.** Every Prisma `User` query needs `where: { deletedAt: null }`. This is the most common mistake.
2. **next-auth v4 only.** Do NOT use v5/Auth.js APIs. `authOptions` is imported from `@/lib/authOptions`, not auto-discovered.
3. **Tailwind 4 has no config file.** No `tailwind.config.js/ts`.
4. **`@/` resolves to repo root.** Imports: `@/lib/...`, `@/components/...`, not `@/src/...`.
5. **Session update requires `update()` call on client** after `updateMe` — JWT is not auto-refreshed.
6. **`react cache()` vs `'use cache'`:** `getMe()` uses `react cache()` (request-level). List/detail queries use `'use cache'` (persistent, tag-based). Do not confuse.
7. **Prisma singleton** at `@/lib/prisma.ts` — never instantiate `PrismaClient` directly in components or actions.
8. **No middleware.ts** — no global route guard in layouts. All route protection (role roots + sub-roles) lives in `proxy.ts`; layouts only wrap templates.
9. **Password rounds:** 12 in all server actions, 10 in seed.
10. **Server action responses** are plain objects — never throw. Pattern: `{ success, message, payload? }`.
11. **EmbedPDF viewers are client-only.** Render `<PDFViewer>` (drop-in) or the headless `<EmbedPDF>` provider from `'use client'` components (Canvas/WASM). See `.agents/skills/embedpdf/SKILL.md`.
