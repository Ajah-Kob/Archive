# Adviser Document Workspace — Design

**Date**: 2026-08-18
**Status**: Approved (design)
**Feature**: Adviser document review workspace with in-PDF annotations

---

## 1. Overview

A full-page workspace where an adviser reviews a submitted chapter document inside the browser using a headless EmbedPDF viewer, annotates it (highlights, ink, sticky notes, free text, strikeout), and submits a verdict (Approve / Request Revisions). Annotations auto-save as private drafts and are committed to the shared record when the verdict is submitted.

This replaces the current "View in new tab" experience in `SubmissionDetailsDrawer` with an in-app review surface.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| EmbedPDF path | **Headless** (`@embedpdf/core` + plugins) — must match Archive's design system |
| Page scope | Full review workspace (viewer + annotations + metadata + verdict) |
| Annotation tools | Highlight, Free text, Ink/pen, Sticky notes, Strikeout |
| Persistence | Auto-save draft (debounced) + commit on verdict |
| Verdict UI | Sticky bottom bar + confirmation modal (shows annotation summary) |
| Routing | New route `/faculty/evaluation/[submissionId]`; keep existing drawer for quick details |
| Layout | Browser-style tab bar (top) → header bar → full-width PDF viewer → bottom action bar; Detail/Comments/Versions as right slide-over panels |

## 3. Routing & Entry

- **New route**: `app/faculty/evaluation/[submissionId]/page.tsx` (server component)
  - `getServerSession` + fetch submission + annotation draft via server actions
  - Passes props to the client workspace component
- **Protection**: `/faculty/evaluation` already requires `isAdviser` in `proxy.ts`; verify the matcher covers the dynamic segment
- **Entry point**: `SubmissionDetailsDrawer` gains an **"Open Workspace"** button → `router.push('/faculty/evaluation/{id}')`. Drawer stays for quick details/versions.

## 4. Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Tab bar (browser-style):  [v3 · current] [v2] [v1]  (+)          │
├──────────────────────────────────────────────────────────────────┤
│ Header: ← Back · Group · Chapter · status │ [🖍][✏️][📝][💬][~~] │ [Detail] [Comments] [Versions] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   PDF viewer (headless) + annotation layers — FULL WIDTH         │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ Bottom bar:  [Draft saved ✓]              [Request Revisions] [Approve] │
└──────────────────────────────────────────────────────────────────┘
```

### 4.1 Tab bar (top, browser-style)

- One tab per open document version; current version is the default tab
- Active tab highlighted; tabs closable; `+` opens the version drawer to add more
- Backed by the headless `DocumentManagerPluginPackage` multi-document state (`activeDocumentId`)

### 4.2 Header bar

Three zones:

1. **Left**: back link, group name, chapter label, status badge
2. **Center**: annotation toolbar — Highlight, Free text, Ink/pen, Sticky notes, Strikeout + selection cursor + delete (when an annotation is selected)
3. **Right**: `[Detail] [Comments] [Versions]` buttons

### 4.3 Viewer area (full width)

- Headless EmbedPDF: `DocumentContent` → `Viewport` → `Scroller` → per-page `PagePointerProvider` + `RenderLayer` + `SelectionLayer` + `AnnotationLayer`
- Plugin registration order: document-manager, viewport, scroll, render, interaction-manager, selection, history, annotation

### 4.4 Bottom action bar (sticky)

- Left: draft save status (`Saving…` / `Draft saved ✓` / `Saved just now`)
- Right: `Request Revisions` (amber) + `Approve` (green) — reuse existing drawer button treatments
- Both open the confirmation modal (Section 6.4)

### 4.5 Slide-over panels (right, on-demand)

- **Detail**: submission metadata — group, chapter, phase, submitted by, date, file name/size/type, current status, review history (reviewed by/at, note)
- **Comments**: list of annotations on the active document; clicking a comment scrolls to its page and highlights the annotation
- **Versions**: list of all chapter versions (reuses `getEvaluationVersions`); clicking a version opens it as a new tab

## 5. Data Model

New Prisma model:

```prisma
enum AnnotationStatus {
  DRAFT      // auto-saved, adviser-only
  COMMITTED  // visible to the group once verdict is submitted
}

model SubmissionAnnotation {
  id           Int              @id @default(autoincrement())
  submissionId Int
  submission   MilestoneSubmission @relation(fields: [submissionId], references: [id])
  authorId     Int              // adviser's User.id
  author       User             @relation(fields: [authorId], references: [id])
  data         Json             // serialized AnnotationTransferItem[] (base64 stamps)
  status       AnnotationStatus @default(DRAFT)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  deletedAt    DateTime?

  @@unique([submissionId, authorId])
  @@index([deletedAt])
}
```

**Flow:**
1. Adviser annotates → debounced auto-save upserts their row as `DRAFT` (per `submissionId + authorId`)
2. Adviser submits verdict → `reviewSubmission` also flips the row to `COMMITTED`
3. Students later query only `COMMITTED` rows (student viewer is a separate future feature)
4. Annotations stay attached to the submission row they were made on; resubmissions create new rows, old annotations remain as history

**Serialization**: `AnnotationTransferItem[]` with base64-encoded stamp `ArrayBuffer`s (`ArrayBuffer` does not survive `JSON.stringify`).

## 6. Server Actions

New `lib/actions/annotations.ts` (all `'use server'`, `{ success, message, payload? }` shape, `requireAdviser` guard + submission-belongs-to-adviser check, mirroring `evaluation.ts`):

| Action | Purpose | Cache |
|---|---|---|
| `getSubmissionAnnotations(submissionId)` | Load the adviser's own row (draft or committed) for the workspace | `'use cache'`, tag `submission-<id>-annotations` |
| `saveAnnotationDraft(submissionId, data)` | Upsert the adviser's row as `DRAFT` | mutation; revalidate tag |
| `commitAnnotations(submissionId, data)` | Flip row to `COMMITTED` (called by review flow) | mutation; revalidate tag |

**Verdict flow**: the client calls `reviewSubmission` (existing, in `evaluation.ts`) first; on success it calls `commitAnnotations` as a separate follow-up. A failed commit does not block the verdict — the draft remains `DRAFT` and can be committed on a later visit.

**Guards**: `requireAdviser` + verify `milestone.group.adviserId === adviser.id` and `deletedAt: null` on all queries (soft-delete rule).

## 7. Components

```
components/evaluation/workspace/
├── DocumentWorkspace.tsx      # Client orchestrator (headless EmbedPDF root)
├── WorkspaceTabBar.tsx        # Browser-style tabs
├── WorkspaceHeader.tsx        # Context | annotation toolbar | Detail/Comments/Versions
├── AnnotationToolbar.tsx      # Tool buttons via useAnnotation
├── PdfViewer.tsx              # Headless EmbedPDF setup (plugins, layers)
├── BottomActionBar.tsx        # Draft status + Approve / Request Revisions
├── VerdictConfirmModal.tsx    # Confirmation with annotation summary
├── DetailPanel.tsx            # Submission metadata slide-over
├── CommentsPanel.tsx          # Annotation list; click → jump to page
├── VersionDrawer.tsx          # Version list; click → open as tab
└── useAnnotationDraft.ts      # Debounced auto-save hook (client)
```

**Key implementation notes:**
- All viewer/panel components are `'use client'` (Canvas/WASM)
- `useAnnotationDraft` debounces `exportAnnotations()` → `saveAnnotationDraft` (~1.5s after last change)
- Comments panel jump-to-page uses the scroll/viewport plugin API to scroll to the annotation's `pageIndex`
- Version tabs use `DocumentManagerPluginPackage` `addDocument`/`setActiveDocument`
- Annotation author set to the adviser's name via plugin config

## 8. Testing

- **Unit**: serialization helpers (base64 round-trip for stamps), draft upsert logic, guard logic
- **Server action tests**: `saveAnnotationDraft` upsert + revalidation; `commitAnnotations` status flip; unauthorized/not-your-group rejection
- **Component tests**: toolbar tool activation, bottom bar verdict flow, comments jump-to-page, tab open/close
- **Manual**: full round-trip — annotate → reload → annotations restored; verdict → student sees committed annotations (future student viewer)

## 9. Out of Scope

- Student-side annotation viewer (separate future feature; students query `COMMITTED` rows)
- Editing/deleting committed annotations after verdict
- Multi-adviser simultaneous review conflict resolution (last-write-wins per author)
- Exporting annotated PDFs to disk

## 10. Open Questions

- Exact scroll-to-page API name in the scroll plugin (verify against `@embedpdf/plugin-scroll` docs during implementation)