# Archived Plan: Toolbar Consistency Across Coordinator / Templates / Faculty Pages

> **Status:** Archived / superseded by the Faculty Page implementation
> **Date:** Aug 2026
> **Scope:** Unify the toolbars of the Coordinator, Templates, and Faculty dashboard pages (search, filter, add/action buttons).

---

## Purpose

Each dashboard page originally had its own ad-hoc toolbar markup with slightly
different button styles, spacing, and behavior. This plan proposed a shared,
consistent toolbar pattern across the three pages.

---

## Proposed changes

1. Extract a reusable `TableToolbar` component with:
   - search input (fixed `320px`, `bg-[#f4f5fc]`, `border-[#dddff0]`)
   - optional filter dropdown (chevron + popover menu)
   - optional primary/secondary action buttons aligned right
2. Apply it to:
   - `/coordinator` (SectionTable) — Manage Coordinators action
   - `/templates` (TemplatesTable) — upload action
   - `/faculty` (FacultyTable) — Manage Coordinators + join-code action
3. Keep per-page props minimal: `placeholder`, `onSearch`, `filters`, `actions`.

---

## Outcome / supersession

- The **Faculty page** was later consolidated into the single faculty-management
  surface (profile drawer, remove-faculty, workload monitoring, Manage
  Coordinators drawer relocated from `/coordinator`).
- `/coordinator` became monitor-only (its Manage Coordinators button was
  removed).
- Toolbar consistency was instead achieved page-by-page using the shared
  **grid-column layout** pattern introduced on the templates table
  (`GRID_COLS` on `TemplatesTable`, reused by the faculty table) rather than a
  dedicated toolbar abstraction.
