# Git Workflow Rules

This document defines the team's standards for using Git and GitHub. Following these conventions keeps the repository organized, makes collaboration easier, and maintains a clean project history.

---

# Branch Naming Conventions

Branch names should clearly describe the work being done and follow a consistent naming pattern.

## General Rules

- Keep branch names short and descriptive.
- Use **kebab-case** (`-`) for the descriptive portion.
- Prefix every branch with the appropriate branch type.
- Include an issue number when applicable.

---

## Branch Prefixes

| Prefix      | Purpose                                                  |
| ----------- | -------------------------------------------------------- |
| `feature/`  | New feature or user-facing functionality                 |
| `fix/`      | Bug fixes                                                |
| `refactor/` | Code restructuring without changing behavior             |
| `perf/`     | Performance improvements                                 |
| `docs/`     | Documentation updates                                    |
| `test/`     | Test-related changes                                     |
| `chore/`    | Maintenance tasks (dependencies, configuration, tooling) |
| `hotfix/`   | Urgent fixes for production or release branches          |
| `release/`  | Release preparation branches                             |

---

## Branch Naming Patterns

Use one of the following formats:

```text
feature/{short-description}
feature/{issue-number}-{short-description}

fix/{issue-number}-{short-description}

hotfix/{short-description}

docs/{short-description}

refactor/{short-description}

chore/{short-description}
```

---

## Examples

```text
feature/calendar-ui
feature/123-calendar-month-navigation

fix/456-incorrect-timezone

refactor/sidebar-structure

docs/project-structure

chore/update-dependencies

hotfix/login-redirect
```

---

## Branch Guidelines

- Keep names under **50 characters** whenever possible.
- Separate words using hyphens (`-`).
- Avoid using personal names in branch names.
- Avoid generic names such as `test`, `new`, `update`, or `branch`.
- Create a new branch for every feature, bug fix, or documentation change.

---

# Commit Message Conventions

Every commit should clearly describe the change it introduces. We follow a lightweight version of the **Conventional Commits** specification.

## Commit Structure

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Components

- **type** – Category of the change.
- **scope** – Optional area of the project (e.g., `auth`, `calendar`, `sidebar`).
- **short summary** – Brief description written in the present tense.
- **body** – Optional explanation describing the reason for the change.
- **footer** – Optional metadata such as issue references.

---

## Commit Types

| Type       | Description                                         |
| ---------- | --------------------------------------------------- |
| `feat`     | Introduces a new feature                            |
| `fix`      | Fixes a bug                                         |
| `docs`     | Documentation-only changes                          |
| `style`    | Formatting changes that do not affect functionality |
| `refactor` | Improves code structure without changing behavior   |
| `perf`     | Performance improvements                            |
| `test`     | Adds or updates tests                               |
| `chore`    | Maintenance, tooling, dependencies, configuration   |
| `build`    | Changes affecting the build system                  |
| `ci`       | Continuous Integration configuration changes        |

---

## Commit Message Examples

### New Feature

```text
feat(calendar): add month navigation

fix(auth): prevent redirect loop on login

docs(readme): add getting started section

refactor(sidebar): simplify navigation layout

```

---

## Commit Guidelines

- Keep the subject line under **50 characters** whenever possible.
- Use the **present tense**.

✅ Good

```text
add calendar navigation
fix login validation
update sidebar layout
```

❌ Avoid

```text
added calendar navigation
fixed login validation
updating sidebar
```

- Do **not** end the subject line with a period.
- Write meaningful commit messages that explain **what** changed.
- Include a commit body when additional context is helpful.
- Reference related issues using:

```text
Closes #123
```

when the commit or pull request resolves an issue.

---

# Good Examples

```text
feat(calendar): add month navigation

fix(repository): resolve duplicate upload issue

docs(project): add Git workflow documentation

refactor(auth): simplify validation logic

chore(deps): update React to latest version

```

---

# Pull Request Reminder

Before opening a Pull Request:

- Ensure your branch is up to date with the latest `develop` branch.
- Verify that your code follows the project's coding standards.
- Test your changes locally.
- Push your feature branch to your fork.
- Follow the Pull Request template described in the **Pull Request Guide**.

---

Following these conventions ensures a clean Git history, consistent branch organization, and a smoother code review process for the entire team.
