<!-- Context: archive/submission-history | Priority: medium | Version: 1.0 | Updated: 2026-08-29 -->

# Guide: Submission History

**Core Idea**: The Defense Session contains a Submission History component that preserves every document submission associated with the defense — the initial document plus every resubmission.

**Key Points**:
- The **initial document** has only an **Open Document** action (no detail drawer).
- Every resubmission after the initial document has a **View Details** action that opens a detail drawer.
- History grows as the student submits new versions; each entry shows version, date, status, and action.
- Provides a complete audit trail of the defense and all revision cycles.

**History Layout**:
```text
Initial Document   Version 1.0 • Aug 28, 2026   Used in Defense   [Open Document]
Resubmission 1     Version 2.0 • Sep 2, 2026    In Review         [View Details]
Resubmission 2     Version 3.0 • Sep 5, 2026    Revision Required [View Details]
```

**Action Rule**:
```text
Initial Document → Open Document
Resubmission 1+  → View Details → Detail Drawer
```

**Reference**: `PROMPT.md` §6, §12

**Related**:
- concepts/document-versioning.md
- guides/submission-detail-drawer.md
- lookup/submission-statuses.md
