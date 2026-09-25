# Coordinator Assignment Workflow

## Purpose

This workflow describes how an **Admin or Program Chair** directly assigns the **Coordinator** role to a faculty member. The role is active immediately; no invitation, approval, or acceptance step is required. The faculty member receives an in-app notification and becomes eligible to manage an assigned class section within Archive. A **Program Chair** may hold both roles and may assign themselves.

---

# Actors

* Admin or Program Chair
* Faculty Member

---

# Preconditions

Before this workflow begins:

* The Admin or Program Chair is authenticated with a live management role.
* The faculty member has already created an Archive account.
* The faculty member has successfully joined the faculty through a valid faculty invitation.
* The faculty member does not already have an active Coordinator role.

---

# Workflow

1. The Admin or Program Chair opens **Coordinator Management** and selects **Add Coordinator**.
2. The system lists live faculty without an active Coordinator role, including a Program Chair who does not already hold the Coordinator role.
3. The Admin or Program Chair selects **Assign** for a faculty member; a Program Chair may select themselves.
4. The Admin or Program Chair confirms **Assign Coordinator** in the confirmation dialog.
5. The system validates the live Faculty and User records and creates or revives the Coordinator record immediately.
6. The system creates an in-app notification for the faculty member and refreshes faculty/coordinator management data.
7. Coordinator-exclusive features become available after the normal session refresh.
8. The assigned Coordinator may manage a class section after an Admin or Program Chair assigns that section.

---

# Postconditions

After successful assignment:

* The selected faculty member has an active Coordinator role.
* A `COORDINATOR_ASSIGN` audit event records the change.
* The faculty member has a `Coordinator role assigned` notification.
* A Program Chair may hold both the Program Chair and Coordinator roles.
* Coordinator-exclusive features become available after session refresh.
* The faculty member is eligible to appear in section assignment lists.

---

# Alternate Flows

## AF-01: Faculty Already Assigned as Coordinator

If the selected faculty member already has an active Coordinator role, they do not appear in the available-faculty list. A direct action invoked against stale data returns an already-assigned refusal.

---

## AF-02: Faculty Has Not Joined the System

Faculty who have not completed registration and joined the faculty are not eligible for coordinator assignment and do not appear in the available-faculty list.

---

## AF-03: Legacy Pending Coordinator Invitation

Coordinator invitations are no longer sent. Legacy pending Coordinator invitations are cancelled when read, and attempting to accept one returns:

`Coordinator assignments are now immediate and no longer require acceptance.`

---

# Business Notes

* Only Admins and the Program Chair may assign or revoke the Coordinator role.
* A Program Chair may hold both the Program Chair and Coordinator roles and may self-assign.
* Assignment is immediate; Coordinator invitations and acceptance are not part of the active workflow.
* The Coordinator record and faculty notification commit together or not at all.
* Assigning the Coordinator role does not automatically create or assign a class section.
* Removing the Coordinator role remains blocked while the faculty member manages active sections.

---

# Result

The selected faculty member is granted the Coordinator role immediately, receives an in-app notification, and can manage class sections assigned to them within Archive.
