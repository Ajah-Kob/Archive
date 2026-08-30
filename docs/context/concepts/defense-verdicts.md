<!-- Context: archive/defense-verdicts | Priority: high | Version: 1.0 | Updated: 2026-08-29 -->

# Concept: Defense Verdicts

**Core Idea**: The Chair submits one of three verdicts after a defense — Approved, Minor Revision, or Major Revision. Only the Chair has access to the verdict controls; regular panelists only see "Waiting for the Chair's verdict."

**Key Points**:
- **Approved** → defense completes immediately; no revision cycle; initial document stays the official defended version.
- **Minor Revision** → student revises; versioning + panel-review workflow begins.
- **Major Revision** → same versioning mechanism as Minor; the difference is severity of required changes.
- Only the Chair can submit the verdict; all panelists can view the final verdict after submission.
- Minor/Major both create a resubmission cycle; the versioning and panel-review flow is identical.

**Verdict UI**:
```text
Defense Verdict
  ○ Approved
  ○ Minor Revision
  ○ Major Revision
  [Submit Verdict]        # Chair only
```

**Reference**: `PROMPT.md` §18–21

**Related**:
- concepts/defense-lifecycle.md
- concepts/document-versioning.md
- lookup/core-business-rules.md
