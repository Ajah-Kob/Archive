# Coordinator Assignment Workflow

## Purpose

This workflow describes how the **Program Chair** assigns the **Coordinator** role to a faculty member. Once assigned, the faculty member gains access to coordinator-exclusive features and becomes responsible for creating and managing the corresponding class section within Archive.

---

# Actors

* Program Chair
* Faculty Member

---

# Preconditions

Before this workflow begins:

* The Program Chair is authenticated.
* The faculty member has already created an Archive account.
* The faculty member has successfully joined the faculty through a valid faculty invitation.
* The faculty member has not yet been assigned the Coordinator role.

---

# Workflow

1. The Program Chair navigates to the **Coordinator Management** page.
2. The system displays a list of eligible faculty members who can be assigned as coordinators.
3. The Program Chair selects a faculty member.
4. The Program Chair confirms the coordinator assignment.
5. The system assigns the **Coordinator** role to the selected faculty member.
6. The system grants the faculty member access to coordinator-exclusive features.
7. The assigned coordinator may now create and manage the corresponding class section within Archive based on the academic section they handle in the institution.

---

# Postconditions

After successful completion:

* The selected faculty member is assigned the Coordinator role.
* Coordinator-exclusive features become available.
* The coordinator is authorized to create and manage class sections within Archive.

---

# Alternate Flows

## AF-01: Faculty Already Assigned as Coordinator

If the selected faculty member is already assigned as a coordinator, the faculty member shall not appear in the list of available faculty members.

---

## AF-02: Faculty Has Not Joined the System

Faculty members who have not completed account registration and joined the faculty through a valid invitation are not eligible for coordinator assignment and shall not appear in the list of available faculty members.

---

# Business Notes

* Only the Program Chair may assign or revoke the Coordinator role.
* A faculty member must first create an Archive account and join the faculty before becoming eligible for coordinator assignment.
* Assigning the Coordinator role does not automatically create a class section within Archive.
* The coordinator is responsible for creating the corresponding class section in Archive based on the academic section they manage in the institution.

---

# Result

The selected faculty member is granted the Coordinator role and gains access to coordinator-exclusive features, allowing them to create and manage class sections within Archive.
