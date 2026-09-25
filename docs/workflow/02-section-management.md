# Section Management Workflow

## Purpose

This workflow describes how an Admin or the Program Chair creates a class section within Archive, assigns or reassigns its Coordinator, archives empty sections, and how the assigned Coordinator manages that section. A class section serves as the primary workspace where students are organized before forming capstone groups.

Upon creating a section, the system generates a unique invitation link that students use to join. Students must join a class section before they can access capstone management features.

---

# Actors

- Admin or Program Chair
- Coordinator
- Student

---

# Preconditions

Before this workflow begins:

- The Admin or Program Chair is authenticated.
- The corresponding active class section name is not already in use for the selected academic year.
- The faculty member who will own the section has been assigned the Coordinator role, or the section is intentionally created unassigned.
- Students have already created their Archive accounts.

---

# Workflow

## Part A – Section Creation

1. The Admin or Program Chair navigates to the global **Section Management** page.
2. The Admin or Program Chair creates a new class section by entering the required section name and academic year.
3. The system validates the entered information, including active-section name uniqueness for the selected academic year.
4. The system always creates the class section as unassigned; a manager assigns its Coordinator from the global row action.
5. The system generates a unique invitation code for the newly created section.
6. The assigned Coordinator, or the Admin/Program Chair after coordinator assignment, shares the invitation code with students belonging to that academic section.

---

## Part B – Coordinator Assignment and Reassignment

1. The Admin or Program Chair opens a global section row and chooses **Assign Coordinator** when the section is unassigned or **Edit Coordinator** when it already has an owner.
2. Edit mode preselects the current Coordinator, marks that option as **Current**, and requires a different active Coordinator before saving.
3. The system revalidates the live section, current owner, target Coordinator, Faculty record, and User record before writing.
4. The update is atomic: if another manager changed the section after the modal opened, the stale edit is refused instead of overwriting the newer assignment.
5. The global table, coordinator workload views, and affected My Sections caches refresh after a successful assignment or reassignment. The modal does not support unassigning a Coordinator.

---

## Part C – Student Joins Section

1. The user receives an invitation/join code for a section that has an assigned Section Coordinator.
2. The user enters the invitation/join code in the system.
3. The system validates the invitation/join code.
4. Upon successful validation, the system registers the user as a Student and stores the student's information in the database.
5. The system adds the student to the corresponding class section.
6. The student gains access to student-specific features within the system.
7. The student may now create a new capstone group or join an existing capstone group within their assigned section.

---

## Part D – Section Archiving

1. The Admin or Program Chair chooses **Archive Section** from a global section row.
2. The neutral-gray confirmation explains that an archived section disappears from active lists and releases its name for reuse.
3. The system locks the Section row, rechecks that it is live and empty, and refuses archival if active students or active groups exist.
4. The Section and its student join code are soft-deleted in one Serializable transaction, records a `SECTION_ARCHIVE` audit event after commit, and immediately refreshes global, faculty-workload, and coordinator-scoped lists.
5. Student enrollment locks the same Section row and rechecks the live Section and join code, so a student cannot join while archival is in progress.
6. There is no archive drawer or restore interface; archived rows remain preserved in the database.

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

If an Admin or the Program Chair attempts to create a section whose normalized name is already used by another active section in the same academic year, the system prevents duplicate creation and displays: `This name is taken by an active section.` Archived sections do not reserve their names.

---

## AF-02: Invalid Invitation Link

If a student accesses an invalid, expired, or revoked invitation code, the system denies the request and informs the student that the invitation is no longer valid.

---

## AF-03: Student Already Joined a Section

Once a user has joined a section and become a student, they shouldn't even be able to access the page where the user can join a role.

---

# Business Notes

- Only Admins and the Program Chair may create, assign, reassign, or archive class sections. Only empty sections may be archived.
- An assigned Coordinator may edit the assigned section's name and header color; academic year is read-only for Coordinators.
- Active section names are unique within an academic year; archived sections do not reserve names.
- Each class section has a unique invitation code.
- Students may belong to only one active class section at a time.
- Students must join a class section before accessing the student-specific features.
- Students who have not joined a class section may only access the Capstone Repository and account-related features.
- Creating a class section does not automatically create capstone groups.
- Group creation is handled separately in the **Group Management Workflow**.

---

# Result

A class section is successfully created within Archive, students join the section through the generated invitation link, and they become eligible to create or join capstone groups.
