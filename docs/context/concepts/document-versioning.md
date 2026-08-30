<!-- Context: archive/document-versioning | Priority: high | Version: 1.0 | Updated: 2026-08-29 -->

# Concept: Document Versioning

**Core Idea**: Every student submission is preserved as a separate, immutable version. A previous version is never overwritten by a newer one, and the Defense Session always displays the latest submitted version.

**Key Points**:
- The **initial document** is the exact version used during the defense; it is immutable and permanently associated with the session.
- The **Defense Document** section always points to the latest submitted version (e.g. Version 2.0 after a revision).
- Each resubmission creates a new version (Version 1.0 → 2.0 → 3.0 …).
- The initial document is preserved through Submission History.
- Version status belongs to that specific version and is never overwritten by later versions.

**Version Chain**:
```text
Version 1.0 (Initial, Used in Defense)
  ↓ Minor/Major Revision
Version 2.0 (Latest, In Review)
  ↓
Version 3.0 (Latest, In Review)
```

**Reference**: `PROMPT.md` §3–5, §13

**Related**:
- concepts/defense-verdicts.md
- guides/submission-history.md
- lookup/submission-statuses.md
