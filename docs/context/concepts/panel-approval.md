<!-- Context: archive/panel-approval | Priority: high | Version: 1.0 | Updated: 2026-08-29 -->

# Concept: Panel Approval Tracking

**Core Idea**: Each panelist's approval is tracked independently per document version. A panelist who approved a version does not automatically need to approve every later version.

**Key Points**:
- Approval state is per-panelist and per-version (Approved / Revision Required / Pending).
- Feedback from panelists who require revision is sent to the student.
- A panelist who already approved does not need to submit new feedback on subsequent versions unless explicitly required.
- The detail drawer shows which panelists approved and which still require action for that specific version.

**Per-Version Panel State**:
```text
Version 2.0
  Panel 1  ✓ Approved
  Panel 2  ✕ Revision Required
  Panel 3  ✕ Revision Required
```

**Reference**: `PROMPT.md` §9, §24 (Panel Approval)

**Related**:
- concepts/revision-responsibility.md
- guides/submission-detail-drawer.md
- lookup/core-business-rules.md
