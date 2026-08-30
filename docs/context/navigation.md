<!-- Context: archive/navigation | Priority: critical | Version: 1.0 | Updated: 2026-08-29 -->

# Defense Feature Context

**Purpose**: Project-specific knowledge for the Archive CMS Defense feature, extracted from `PROMPT.md`.

**Source**: `PROMPT.md` (1095 lines) — the complete Defense feature workflow spec.

---

## Concepts (what it is)

| File | Priority | Summary |
|------|----------|---------|
| `concepts/defense-lifecycle.md` | high | End-to-end defense lifecycle: schedule → invite → session → verdict → revisions → completion |
| `concepts/defense-verdicts.md` | high | Approved / Minor Revision / Major Revision; only Chair submits |
| `concepts/document-versioning.md` | high | Initial doc immutable; never overwrite; latest doc always displayed |
| `concepts/panel-approval.md` | high | Independent per-panelist approval tracking per version |
| `concepts/revision-responsibility.md` | high | Carry-forward review only to unresolved panelists |

## Guides (how to)

| File | Priority | Summary |
|------|----------|---------|
| `guides/resubmissions-tab.md` | high | Personal action queue; Document Review table; Evaluate Document |
| `guides/submission-history.md` | medium | Initial doc + resubmissions; View Details drawer rule |
| `guides/submission-detail-drawer.md` | medium | Per-version state; panel review checklist |
| `guides/document-workspace.md` | medium | Initial vs resubmitted doc; annotations; feedback |

## Lookup (reference)

| File | Priority | Summary |
|------|----------|---------|
| `lookup/core-business-rules.md` | high | Authoritative business rules |
| `lookup/submission-statuses.md` | medium | IN REVIEW / REVISION REQUIRED / APPROVED |
| `lookup/resubmissions-columns.md` | medium | Resubmissions tab column set |

---

## Related Context

- `docs/workflow/07-proposal-defense.md` — proposal defense business process
- `docs/workflow/09-final-defense.md` — final defense business process
- `docs/04-business-rules.md` — general business rules
