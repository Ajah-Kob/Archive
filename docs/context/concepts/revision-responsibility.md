<!-- Context: archive/revision-responsibility | Priority: high | Version: 1.0 | Updated: 2026-08-29 -->

# Concept: Revision Responsibility Carry-Forward

**Core Idea**: When a new version is submitted, only panelists who have not yet approved the previous version need to review the new version. A panelist's prior approval remains valid and carries forward.

**Key Points**:
- Review responsibility carries forward only to unresolved panelists.
- A panelist who approved the previous version shows "Previously Approved / No action required" on the new version.
- Unresolved panelists show "Pending Review" and must evaluate the new version.
- This rule drives the personal Resubmissions queue (only outstanding reviewers see the task).

**Carry-Forward Example**:
```text
Version 2.0:  Panel 1 ✓ | Panel 2 ✕ | Panel 3 ✕
Version 3.0:  Panel 1 ✓ Previously Approved (no action)
              Panel 2 ○ Pending Review
              Panel 3 ○ Pending Review
```

**Reference**: `PROMPT.md` §11, §24 (Revision Responsibility)

**Related**:
- concepts/panel-approval.md
- guides/resubmissions-tab.md
- lookup/core-business-rules.md
