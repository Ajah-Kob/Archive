# Section Management Workflow

## Purpose

This workflow describes how a Coordinator creates and manages a class section within Archive. A class section serves as the primary workspace where students are organized before forming capstone groups.

Upon creating a section, the system generates a unique invitation link that students use to join. Students must join a class section before they can access capstone management features.

---

# Actors

- Coordinator
- Student

---

# Preconditions

Before this workflow begins:

- The faculty member has been assigned the Coordinator role.
- The coordinator is authenticated.
- The corresponding class section has not yet been created within Archive.
- Students have already created their Archive accounts.

---

# Workflow

## Part A – Section Creation

1. The Coordinator navigates to the **Section Management** page.
2. The Coordinator creates a new class section by entering the required section information (e.g., academic year, section code, and other required details).
3. The system validates the entered information.
4. The system creates the class section.
5. The system generates a unique invitaion code for the newly created section.
6. The Coordinator shares the invitation code with students belonging to that academic section.

---

## Part B – Student Joins Section

1. The user receives an invitation/join code from the assigned Section Coordinator.
2. The user enters the invitation/join code in the system.
3. The system validates the invitation/join code.
4. Upon successful validation, the system registers the user as a Student and stores the student's information in the database.
5. The system adds the student to the corresponding class section.
6. The student gains access to student-specific features within the system.
7. The student may now create a new capstone group or join an existing capstone group within their assigned section.

---

# Postconditions

After successful completion:

- The class section exists within Archive.
- Students become members of the class section.
- Students gain access to capstone management features.
- Students become eligible to create or join capstone groups.

---

# Alternate Flows

## AF-01: Section Already Exists

If the coordinator attempts to create a section that already exists within Archive, the system prevents duplicate creation and informs the coordinator.

---

## AF-02: Invalid Invitation Link

If a student accesses an invalid, expired, or revoked invitation code, the system denies the request and informs the student that the invitation is no longer valid.

---

## AF-03: Student Already Joined a Section

Once a user has joined a section and become a student, they shouldn't even be able to access the page where the user can join a role.

---

# Business Notes

- Only assigned Coordinators may create and manage class sections.
- Each class section has a unique invitation code.
- Students may belong to only one active class section at a time.
- Students must join a class section before accessing the student-specific features.
- Students who have not joined a class section may only access the Capstone Repository and account-related features.
- Creating a class section does not automatically create capstone groups.
- Group creation is handled separately in the **Group Management Workflow**.

---

# Result

A class section is successfully created within Archive, students join the section through the generated invitation link, and they become eligible to create or join capstone groups.
