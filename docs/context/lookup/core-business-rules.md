<!-- Context: archive/core-business-rules | Priority: high | Version: 1.0 | Updated: 2026-08-29 -->

# Lookup: Core Business Rules

**Core Idea**: The authoritative set of business rules governing the Defense feature. Reference these when implementing or reviewing defense behavior.

**Rules**:
- **Defense Document**: always displays the latest submitted version; the initial document stays permanently preserved.
- **Initial Document**: exact version used during defense; immutable; openable in Document Workspace; shows annotations; no detail drawer.
- **Submission History**: contains initial document + every resubmission; each resubmission has a View Details action.
- **Submission Detail Drawer**: shows that version's state (status, panel checklist, who approved, who still needs action); historical details never overwritten.
- **Versioning**: every resubmission creates a new version; never overwrite previous versions.
- **Panel Approval**: tracked independently per panelist; an approver does not auto-approve later versions.
- **Revision Responsibility**: on a new version, review carries forward only to panelists who have not approved the previous revision.
- **Feedback**: feedback from panelists requiring revision is sent to the student; an approver need not resubmit feedback unless required.
- **Chair**: only the Chair submits the final defense verdict.
- **Resubmissions**: the tab is a personal action queue; a faculty member only sees submissions requiring their evaluation.

**Reference**: `PROMPT.md` §24

**Related**:
- concepts/defense-lifecycle.md
- concepts/revision-responsibility.md
- guides/resubmissions-tab.md
