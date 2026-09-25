# Archive Workflow Documentation

## Overview

This directory contains the business workflows that define the complete capstone lifecycle implemented in **Archive**. Each document focuses on a specific business process and describes the actors, preconditions, workflow, postconditions, alternate flows, business rules, and expected outcomes.

The workflows are organized according to the chronological flow of a capstone project, beginning with coordinator assignment and ending with progress monitoring.

---

# Workflow Sequence

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
Repository
```

---

# Workflow Documents

## 1. Coordinator Assignment

Assigns the **Coordinator** role to a faculty member. Once assigned, the coordinator gains access to coordinator-exclusive features and can manage assigned class sections within Archive.

**Document:** [01-coordinator-assignment.md](./01-coordinator-assignment.md)

---

## 2. Section Management

Describes how Admins and the Program Chair create class sections, generate invitation links, assign coordinators, and allow students to join assigned sections.

**Document:** [02-section-management.md](./02-section-management.md)

---

## 3. Group Management

Describes how students create capstone groups, invite members from the same section, and gain access to the shared milestone workspace.

**Document:** [03-group-management.md](./03-group-management.md)

---

## 4. Adviser Assignment

Describes how groups invite their previously selected adviser into the system and how advisers gain access to adviser-exclusive features after accepting the invitation.

**Document:** [04-adviser-assignment.md](./04-adviser-assignment.md)

---

## 5. Capstone 1

Describes the first phase of the capstone lifecycle, including topic selection, development of Chapters 1–3, adviser consultations, and eligibility for the Proposal Defense.

**Document:** [05-capstone1.md](./05-capstone1.md)

---

## 6. Adviser Review

Describes the adviser review process for chapter submissions, including approvals, revision requests, feedback, and document versioning.

This workflow is reused throughout Capstone 1 and Capstone 2.

**Document:** [06-adviser-review.md](./06-adviser-review.md)

---

## 7. Proposal Defense

Describes the Proposal Defense process, including scheduling, panel assignment, document evaluation, annotations, defense verdicts, and post-defense revisions.

**Document:** [07-proposal-defense.md](./07-proposal-defense.md)

---

## 8. Capstone 2

Describes the second phase of the capstone lifecycle, including Chapters 4–5, adviser review, Final Defense eligibility, and project completion.

**Document:** [08-capstone2.md](./08-capstone2.md)

---

## 9. Final Defense

Describes the Final Defense process, which follows the same evaluation and revision workflow as the Proposal Defense before project completion.

**Document:** [09-final-defense.md](./09-final-defense.md)

---

## 10. Progress Monitoring

Describes how coordinators and advisers monitor the progress of capstone groups throughout the capstone lifecycle.

**Document:** [10-progress-monitoring.md](./10-progress-monitoring.md)

---

# Supporting Documents

The following documents complement the workflow documentation and define system-wide behavior.

* Notification Rules — `../notification-rules.md`
* Business Rules — `../business-rules.md`
* User Roles — `../user-roles.md`
* Project Overview — `../project-overview.md`

---

# Notes

* These workflow documents describe the business processes implemented by Archive.
* Each workflow focuses on a single responsibility and may reference other workflows to avoid duplication.
* Common processes, such as the Adviser Review workflow, are documented once and reused across multiple phases of the capstone lifecycle.
* System-wide rules that apply across multiple workflows are documented separately in the supporting documentation.
