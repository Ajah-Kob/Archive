# System Workflow

This page is the high-level map for the Archive capstone lifecycle. It intentionally stays brief and points to the detailed workflow documents in [docs/workflow](workflow) for the full actors, preconditions, alternate flows, and business rules of each stage.

## Workflow Sequence

```text
Program Chair
   │
   ▼
Coordinator Assignment
   │
   ▼
Section Management
   │
   ▼
Group Management
   │
   ▼
Adviser Assignment
   │
   ▼
Capstone 1
   │
   ├── Topic Proposal
   ├── Chapters 1–3
   ├── Adviser Review
   └── Proposal Defense
   │
   ▼
Capstone 2
   │
   ├── Chapters 4–5
   ├── Adviser Review
   └── Final Defense
   │
   ▼
Progress Monitoring
   │
   ▼
Repository / Archive
```

## Workflow Index

| Stage                  | Summary                                                                             | Detail                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Coordinator Assignment | Program Chair assigns the Coordinator role to a faculty member.                     | [01-coordinator-assignment.md](workflow/01-coordinator-assignment.md) |
| Section Management     | Coordinators create class sections, generate invitation links, and enroll students. | [02-section-management.md](workflow/02-section-management.md)         |
| Group Management       | Students form capstone groups within a class section.                               | [03-group-management.md](workflow/03-group-management.md)             |
| Adviser Assignment     | A group invites its selected adviser and grants adviser access after acceptance.    | [04-adviser-assignment.md](workflow/04-adviser-assignment.md)         |
| Capstone 1             | Topic selection, Chapters 1–3, adviser review, and proposal readiness.              | [05-capstone1.md](workflow/05-capstone1.md)                           |
| Adviser Review         | Shared review cycle for approvals, revision requests, feedback, and versioning.     | [06-adviser-review.md](workflow/06-adviser-review.md)                 |
| Proposal Defense       | Scheduling, panel evaluation, verdicts, and proposal revisions.                     | [07-proposal-defense.md](workflow/07-proposal-defense.md)             |
| Capstone 2             | Chapters 4–5, adviser review, final defense readiness, and archiving.               | [08-capstone2.md](workflow/08-capstone2.md)                           |
| Final Defense          | Final evaluation and archiving of the approved manuscript.                          | [09-final-defense.md](workflow/09-final-defense.md)                   |
| Progress Monitoring    | Coordinators and advisers track group progress in read-only mode.                   | [10-progress-monitoring.md](workflow/10-progress-monitoring.md)       |

## Cross-Cutting Rules

These rules apply across the workflow set and are described in more detail in the individual workflow pages:

- A capstone group is formed before adviser assignment.
- Only the assigned adviser may review a group's chapter submissions.
- Every revision request must include feedback.
- Every revised submission creates a new version to preserve revision history.
- Only coordinators can create and manage class sections, and handle defense scheduling.
- Proposal Defense must be completed before Capstone 2 begins.
- Final Defense must be completed before the approved manuscript is archived.
- Progress monitoring is read-only for coordinators and advisers.

## How To Use This Page

Use this document as the starting point when you need the lifecycle overview. If you need the exact business process, open the linked workflow document for the stage you are working on.
