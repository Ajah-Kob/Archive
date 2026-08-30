<!-- Context: archive/resubmissions-tab | Priority: high | Version: 1.0 | Updated: 2026-08-29 -->

# Guide: Resubmissions Tab

**Core Idea**: The Resubmissions tab on the Faculty Defense page is a **personal action queue** — a shortcut for faculty members who have an outstanding review requirement. It is NOT a global list of all resubmissions.

**Key Points**:
- Only faculty who still need to review the current document see it (per-panelist state).
- Uses the existing **Document Review table** design.
- "Evaluate Document" navigates directly to the latest document version requiring review (no manual navigation through the session/history).
- A panelist who already approved shows no resubmission task.

**Columns**:
| Column | Description |
|--------|-------------|
| Group | Capstone group |
| Section | Group's section |
| Previous Verdict | Minor Revision or Major Revision |
| Defense Date | Original defense date |
| Date Submitted | Date the latest required revision was submitted |
| Action | Evaluate Document |

**Example**:
```text
Group 12 | BSIS-4A | Minor Revision | Aug 30 | Sep 2 | [Evaluate Document]
Group 15 | BSIS-4B | Major Revision | Aug 31 | Sep 4 | [Evaluate Document]
```

**Personal Queue Rule**:
```text
Panel 1 → No resubmission task (already approved)
Panel 2 → Group 12 → Evaluate Document
Panel 3 → Group 12 → Evaluate Document
```

**Reference**: `PROMPT.md` §14–16

**Related**:
- concepts/revision-responsibility.md
- lookup/resubmissions-columns.md
- guides/document-workspace.md
