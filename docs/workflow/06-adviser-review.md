# Adviser Review Workflow

## Purpose

This workflow describes how an adviser reviews chapter submissions, provides feedback, requests revisions, and approves documents submitted by their assigned capstone groups.

The same workflow applies to the review of **Chapters 1 through 5**.

---

# Actors

* Student (Capstone Group)
* Adviser

---

# Preconditions

Before this workflow begins:

* The capstone group has an assigned adviser.
* The capstone group has access to the milestone workspace.
* The group has completed a chapter and is ready for adviser review.

---

# Workflow

## Part A – Chapter Submission

1. The capstone group uploads a chapter document.
2. The system validates and records the submission.
3. The system notifies the assigned adviser of the new submission.

---

## Part B – Document Review

1. The adviser opens the submitted chapter.
2. The adviser reviews the document.
3. The adviser provides feedback.
4. The adviser selects one of the following actions:

   * **Approve**
   * **Request Revisions**

---

## Part C – Approval

1. The adviser marks the submission as **Approved**.
2. The system records the approval.
3. The system notifies the capstone group.
4. The group may continue working on their capstone milestones.

---

## Part D – Revision Request

1. The adviser requests revisions.
2. The adviser includes feedback describing the required changes.
3. The system notifies the capstone group.
4. The group revises the document.
5. The group submits a new version.
6. The workflow returns to **Part B – Document Review**.

---

# Workflow Diagram

```text id="e7hn3v"
Student Uploads Chapter
          │
          ▼
System Notifies Adviser
          │
          ▼
Adviser Reviews Document
          │
          ▼
      Decision
     ┌────┴────┐
     │         │
     ▼         ▼
Approved   Request Revisions
     │         │
     ▼         ▼
 Notify     Student Revises
 Student         │
     │           ▼
     │     Upload New Version
     └───────────┘
```

---

# Postconditions

After successful completion:

* The chapter is approved, **or**
* The group receives revision feedback and submits a new version for review.

---

# Alternate Flows

## AF-01: No Feedback Provided

If the adviser requests revisions, feedback must be provided before the review can be submitted.

---

## AF-02: Multiple Revision Cycles

A chapter may undergo multiple revision cycles until the adviser approves the submission.

---

# Business Notes

* Only the assigned adviser may review the group's submissions.
* Every revision request must include feedback.
* Every submission creates a new version of the document.
* Previous submission versions are retained for reference.
* Students may continue developing subsequent chapters while earlier chapters are under review.
* All required chapters must be approved before the applicable defense.

---

# Related Workflows

* Capstone 1 Workflow
* Capstone 2 Workflow
* Proposal Defense Workflow
* Final Defense Workflow

---

# Result

The submitted chapter is either approved by the adviser or returned to the capstone group for revision until it satisfies the required academic standards.
