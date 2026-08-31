<!-- Context: archive/submission-detail-drawer | Priority: medium | Version: 1.0 | Updated: 2026-08-29 -->

# Guide: Submission Detail Drawer

**Core Idea**: Every resubmission after the initial document has a detail drawer showing the state of that specific document version. Historical submission details must remain accurate and must not be overwritten by later versions.

**Key Points**:
- Shows: version, submission date, document status, previous verdict/revision context, panel review checklist.
- Panel review lists which panelists approved and which still require action.
- Represents the state of that particular version only — it must not dynamically change historical statuses.
- The initial document does NOT have a detail drawer (only Open Document).

**Drawer Example**:
```text
Resubmission Details
Version 2.0 • Submitted September 2, 2026
Status: In Review
Panel Review
  ✓ Panel 1  Approved
  ○ Panel 2  Revision Required
  ○ Panel 3  Revision Required
```

**Reference**: `PROMPT.md` §7, §24 (Submission Detail Drawer)

**Related**:
- concepts/panel-approval.md
- guides/submission-history.md
- lookup/core-business-rules.md
