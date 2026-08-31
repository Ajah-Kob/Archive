<!-- Context: archive/defense-lifecycle | Priority: high | Version: 1.0 | Updated: 2026-08-29 -->

# Concept: Defense Lifecycle

**Core Idea**: The Defense feature manages a capstone defense end-to-end — from scheduling and panel invitations, through the defense session and verdict, to document revisions, resubmissions, panel reviews, and final approval. It is a realistic academic workflow, not just a schedule or document-review table.

**Key Points**:
- Coordinator schedules a defense (group, section, type, date, times, venue, panel) and invites faculty.
- Faculty accept invitations; the defense appears in Faculty → Defense → Upcoming.
- Panelists review the defense document; the Chair submits the final verdict.
- Verdict branches: Approved → Completed; Minor/Major Revision → student revises and resubmits.
- Resubmissions loop until all required panelists approve → Completed.

**Lifecycle Flow**:
```text
Schedule → Invite → Accept → Upcoming → Open Session
  → Panel review → Chair verdict
  → Approved → Completed
  → Minor/Major Revision → Student resubmits
      → Required panelists evaluate → Approved → Completed
```

**Reference**: `PROMPT.md` §1 (Complete Defense Lifecycle)

**Related**:
- concepts/defense-verdicts.md
- concepts/document-versioning.md
- guides/resubmissions-tab.md
