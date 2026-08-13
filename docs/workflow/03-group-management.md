# Group Management Workflow

## Purpose

This workflow describes how students form capstone groups within a class section. A student creates a capstone group and invites other students from the same class section to become members.

Once the group is completed, all members gain access to the shared milestone workspace where they collaborate throughout the capstone lifecycle.

---

# Actors

* Student (Group Leader)
* Student (Group Member)

---

# Preconditions

Before this workflow begins:

* The student is authenticated.
* The student has joined a class section.
* The student does not already belong to a capstone group.
* The class section has been created within Archive.

---

# Workflow

## Part A – Group Creation

1. A student navigates to the **Group Management** page.
2. The student selects **Create Group**.
3. The system creates a new capstone group and assigns the student as the **Group Leader**.
4. The Group Leader enters the required group information.

---

## Part B – Member Invitation

1. The Group Leader opens the list of students belonging to the same class section.
2. The Group Leader selects the students to become group members.
3. The system sends a group invitation to each selected student.

---

## Part C – Invitation Response

1. The invited student receives the group invitation.
2. The student reviews the invitation.
3. The student accepts the invitation.
4. The system adds the student to the capstone group.
5. This process repeats until all intended members have joined.

---

## Part D – Group Completion

1. Once all required members have joined, the capstone group becomes active.

2. All group members gain access to the shared milestone workspace.

3. The group may proceed with adviser selection.

---

# Postconditions

After successful completion:

* A capstone group exists within the class section.
* Group members are successfully assigned to the group.
* The milestone workspace becomes accessible to all group members.
* The group becomes eligible to invite an adviser.

---

# Alternate Flows

## AF-01: Student Already Belongs to a Group

Students who already belong to a capstone group cannot create another group or accept additional group invitations.

---

## AF-02: Student Already Invited

If a student has already received an invitation from the same group, the system prevents duplicate invitations.

---

## AF-03: Student Belongs to Another Group

If an invited student already belongs to another capstone group, the invitation cannot be sent.

---

## AF-04: Student Declines the Invitation

If a student declines the invitation, they are not added to the capstone group.

The Group Leader may invite another eligible student.

---

## AF-05: Student Not in the Same Section

Students who do not belong to the same class section shall not appear in the member selection list and cannot be invited to the group.

---

# Business Notes

* Students may belong to only one capstone group at a time.
* A capstone group may only contain students from the same class section.
* Only students within the same class section are eligible to receive group invitations.
* The student who creates the group automatically becomes the Group Leader.
* The milestone workspace becomes available only after the group has been successfully formed.
* Adviser assignment is handled separately in the **Adviser Management Workflow**.

---

# Result

A capstone group is successfully formed, all members gain access to the shared milestone workspace, and the group becomes eligible to invite an adviser and begin the capstone process.
