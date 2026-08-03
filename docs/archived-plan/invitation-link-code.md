# Archived Plan: Email Invitations (Link + Code)

> **Status:** Archived / not yet implemented
> **Date:** Aug 2026
> **Scope:** Replace the current pick-existing-faculty invitation flow with email-based invitations that support both an accept link and an in-app code.

---

## Purpose

Invite users to join a role without requiring them to retype shared join codes. An admin/coordinator enters the invitee's email, and the system sends one email containing **two** accept credentials:

1. **Invitation link** — works for both registered and unregistered users.
2. **Invitation code** — fallback for users who already have an account and prefer typing a code in-app.

---

## Flows

### Faculty invite (coordinator / adviser / panelist) — sent by admin

1. Admin enters the faculty's **email** + role → `Invitation` created (PENDING, hashed token + code, expiry) → email with accept link + code sent via `sendMail()` (`lib/mailer.ts`).
2. Faculty accepts via link or code:
   - **Link:** logged-in with the same email → `Faculty` record auto-created (if missing) + `Coordinator`/`Adviser` record per role.
   - **Code:** logged in → enters code in-app → same accept logic.
3. Status → `ACCEPTED`, credentials consumed.

### Student invite — sent by coordinator

1. Coordinator enters the student's **email** while managing one of their own sections → `Invitation` created with `role: STUDENT` + `sectionId` → email with accept link + code.
2. Student accepts → `Student` record created linked to that section (reject if already in any section, mirroring `lib/actions/sections.ts` `joinSection` logic).
3. Status → `ACCEPTED`, credentials consumed.

---

## Accept paths

### Path 1 — Link (`/invite/accept?token=...`)

- **Has an account** → logged in, email matches → accept instantly.
- **No account** → link leads to signup (token preserved in URL) → after registration, accept runs automatically (email now matches).

### Path 2 — Code (in-app)

- Requires a logged-in account (this is the "already have an account" path).
- Input similar to the existing join-code UX.
- Validates code → checks expiry/status → creates `Faculty` + role record, or `Student` + section → `ACCEPTED`, code consumed.

---

## Schema changes (`prisma/schema.prisma`)

### `Invitation`

| Field       | Change                                |
| ----------- | ------------------------------------- |
| `facultyId` | `Int` → `Int?` (nullable)             |
| `email`     | Add `String` — invitee's email        |
| `token`     | Add `String @unique` — SHA-256 hash   |
| `code`      | Add `String @unique` — hash stored    |
| `expiresAt` | Add `DateTime`                        |
| `sectionId` | Add `Int?` + relation (student invites) |

### `InvitationRole` enum

- Add `STUDENT`.

---

## Server actions (`lib/actions/invitation.ts`)

| Action | Behavior |
| ------ | -------- |
| `sendInvitation(email, role, sectionId?)` | Validates email, dedupes active invites, creates record + raw token + code (hashes stored), sends one email with link and code, revalidates `invitations` tag. Replaces `sendInvitation(facultyId, role)`. |
| `acceptInvitationByLink(token)` | Auth required. Valid token, unexpired, PENDING → email matches session user → create Faculty/Coordinator/Adviser or Student + section → ACCEPTED + consume token. |
| `acceptInvitationByCode(code)` | Auth required. Valid code, unexpired, PENDING → same accept logic as link. |
| `resendInvitation(id)` | Regenerates token + code and resends email for a PENDING invite. |
| `cancelInvitation(id)` | Keep as-is. |

Also fix the hardcoded `invitedById: 1` to use the session user.

---

## Route

`app/invite/accept/page.tsx`

- Reads `?token=` query param, server-renders status.
- Not authenticated → login/register CTA, token kept in URL.
- Authenticated → validates + accepts, shows success/failure.
- Per-page `getServerSession()` — **no middleware.ts**.

---

## UI updates

- **Faculty management page:** "Invite by email" input + role dropdown (replaces picking existing faculty only).
- **Section management page:** "Invite student by email" per section.
- **Invitation list:** shows email, role, status, expiry, plus Copy link / Resend actions.
- **In-app code entry:** "Join with code" style input for registered users.

---

## Conventions (per AGENTS.md)

- Server action responses: `{ success, message, payload? }`.
- All queries filter `deletedAt: null`.
- Reads: `'use cache'` + `cacheTag('invitations')`; mutations: `revalidateTag('invitations')`.
- Token hashing identical to `lib/actions/util.ts` `hashToken` (SHA-256); raw token/code only in the email.
- No middleware — route protection per page.

---

## Open decisions / assumptions

1. **Expiry:** 3 days (matches join codes; invite is less urgent than password reset).
2. **Code + email match:** require the logged-in email to equal the invitation email for code acceptance (safe default — blocks verbal code sharing; to be confirmed).
3. **Code lifecycle:** single-use (consumed on accept), same as token.
4. **Email always contains both link and code** (one email, not either/or).

---

## Out of scope (for now)

- Student list / picker for invite (coordinator invites by email only, since sections are created per real-life assignment).
- QR codes.
- Bulk/CSV invitations.
