<!-- Context: archive/submission-statuses | Priority: medium | Version: 1.0 | Updated: 2026-08-29 -->

# Lookup: Submission Statuses

**Core Idea**: Each submitted document version has its own status. The status belongs to the specific version and is never overwritten by a newer version.

**Statuses**:
| Status | Meaning |
|--------|---------|
| `IN REVIEW` | Latest version awaiting panelist evaluation |
| `REVISION REQUIRED` | Version needs changes (some panelists did not approve) |
| `APPROVED` | Version accepted by all required panelists |

**Per-Version Example**:
```text
Version 1.0  Used in Defense
Version 2.0  Revision Required
Version 3.0  In Review
```

**Reference**: `PROMPT.md` §13

**Related**:
- concepts/document-versioning.md
- guides/submission-history.md
- concepts/panel-approval.md
