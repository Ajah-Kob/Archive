# Business Rules

## Purpose

This document defines the business rules enforced by Archive throughout the capstone lifecycle. These rules govern user access, section management, group formation, adviser assignment, capstone milestones, defense procedures, repository management, and authorization.

---

# 1. User & Account Rules

### BR-001

All users must create an Archive account before accessing system features.

### BR-002

Students must join a class section before accessing capstone management features.

### BR-003

Faculty members must join the faculty through a valid invitation before they can receive faculty-specific roles.

---

# 2. Coordinator Rules

### BR-101

Only Admins and the Program Chair may assign or revoke the Coordinator role. Assignment is immediate, requires no acceptance, and creates an in-app notification for the faculty member.

### BR-102

Only faculty members who have joined the faculty are eligible for Coordinator assignment.

### BR-103

Assigning the Coordinator role does not automatically create a class section within Archive.

### BR-104

Coordinators are responsible for managing their assigned class sections. Coordinators may edit the assigned section's name and header color, but they may not create, archive, assign, reassign, or change the section's academic year.

---

# 3. Section Rules

### BR-201

Only Admins and the Program Chair may create, assign, reassign, or archive class sections. Only empty sections may be archived, and the Section plus its join code must be archived atomically. Assigned Coordinators may manage their assigned sections within the permitted edit fields. Active section names are unique within an academic year; archived sections do not reserve their names.

### BR-202

Each class section has a unique invitation link.

### BR-203

A student may belong to only one active class section.

### BR-204

Students who have not joined a class section may only access the Repository and account-related features.

### BR-205

Creating a class section does not automatically create capstone groups.

---

# 4. Group Rules

### BR-301

Students may belong to only one capstone group.

### BR-302

A capstone group may only contain students from the same class section.

### BR-303

Only students within the same class section may receive group invitations.

### BR-304

The student who creates the group automatically becomes the Group Leader.

### BR-305

The milestone workspace becomes available only after the capstone group has been successfully formed.

---

# 5. Adviser Rules

### BR-401

Archive does not determine or recommend advisers.

### BR-402

Adviser selection is performed outside the system according to the institution's academic process.

### BR-403

A capstone group may have only one active adviser.

### BR-404

An adviser may supervise multiple capstone groups.

### BR-405

Adviser-exclusive features become available only after the adviser accepts the invitation.

---

# 6. Adviser Review Rules

### BR-501

Only the assigned adviser may review the group's submissions.

### BR-502

Every revision request must include feedback.

### BR-503

Every submission creates a new version of the document.

### BR-504

Previous document versions are retained for reference.

### BR-505

Students may continue developing subsequent chapters while previous chapters are under review.

### BR-506

All required chapters must be approved before the applicable defense.

---

# 7. Capstone Rules

### BR-601

The selected research topic cannot be changed after confirmation.

### BR-602

The research title may be refined during adviser consultations.

### BR-603

Capstone 2 cannot begin until Capstone 1 has been successfully completed.

### BR-604

Only the Coordinator may open the Capstone 2 milestone.

### BR-605

Opening Capstone 2 updates the class section to the next academic level.

---

# 8. Defense Rules

### BR-701

Only the Coordinator may schedule Proposal and Final Defenses.

### BR-702

Each defense panel consists of one Chairperson and two Panel Members.

### BR-703

Students must upload the required manuscript before the scheduled defense.

### BR-704

Panelists may annotate and comment on submitted manuscripts.

### BR-705

All assigned panelists must approve revised submissions before the defense is considered complete.

### BR-706

The Final Defense follows the same review and revision process as the Proposal Defense.

---

# 9. Repository Rules

### BR-801

Only approved final manuscripts may be archived.

### BR-802

Archived capstone manuscripts become available through the Repository.

### BR-803

A capstone project is considered completed only after the approved manuscript has been archived.

---

# 10. Progress Monitoring Rules

### BR-901

Coordinators may monitor only the capstone groups within their assigned class sections.

### BR-902

Advisers may monitor only their assigned capstone groups.

### BR-903

Progress monitoring is read-only and does not modify capstone data.

### BR-904

Progress information is automatically updated as milestones, submissions, approvals, and defenses are completed.

---

# 11. Authorization Rules

### BR-1001

Coordinator-exclusive features are accessible only to Coordinators.

### BR-1002

Adviser-exclusive features are accessible only to assigned advisers.

### BR-1003

Students may access only the capstone workspace of their own group.

### BR-1004

Users may access only the features permitted by their assigned roles.
