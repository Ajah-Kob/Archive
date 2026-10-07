# Consolidation Milestone — Proposal (Not Approved, Not Implemented)

> **Status: paused.** Client request captured, audit complete, design not
> approved, no code written. Resuming requires deciding the open question in
> §3 first — it gates everything else.

---

## 1. Client requirement

Add a milestone to **Capstone 2**, positioned **after Proposal Defense and
before Chapter 4**.

The student submits **chapters 1–3 merged into a single document, rewritten in
past tense**. It behaves like the other chapter milestones (upload → adviser
review → verdict → versions).

## 2. Resulting journey

```
CAPSTONE 1   Chapter 1 → Chapter 2 → Chapter 3 → Proposal Defense
CAPSTONE 2   [Consolidation] → Chapter 4 → Chapter 5 → Final Defense → Archiving
```

It becomes the **opening milestone of Capstone 2** and goes first in
`CAPSTONE2_KEYS`, which means it is gated by the coordinator opening Capstone 2 —
the same gate as Chapter 4.

**Consequence to be aware of:** the milestone revises Capstone 1 material but
sits inside Capstone 2. A student who has passed their proposal defense still
cannot start it until Capstone 2 opens.

## 3. Open decision — this gates the build

`Milestone` requires a chapter, and it is unique per group:

```prisma
enum Chapter { CHAPTER_1 CHAPTER_2 CHAPTER_3 CHAPTER_4 CHAPTER_5 }

model Milestone {
  chapter Chapter          // required, NOT optional
  @@unique([groupId, chapter])
}
```

The new milestone has no chapter number — it *is* chapters 1–3 combined. Note
that `MilestoneKey` already contains non-chapter keys (`PROPOSAL_DEFENSE`,
`FINAL_DEFENSE`, `ARCHIVING`), and those work **because no `Milestone` row is
ever created for them** — they exist only as availability + journey rows. The
consolidation *is* a document submission, so it **does** need a row. That
difference is why this is not a simple enum addition.

| Approach | Change | Assessment |
| --- | --- | --- |
| **A. Add `CONSOLIDATED_1_3` to `Chapter`** ⭐ | enum only | **Recommended.** Every existing mechanism keeps working — the lazy `milestone.upsert`, submission chain, versions, blob tokens, adviser annotations, evaluation queue. Slots into `ChapterKey`, `SLUG_TO_CHAPTER`, `CHAPTER_LABELS`, `CHAPTER_PHASE`, and the compiler then forces every one of them to be updated. Cost: `Chapter` holds a non-chapter value. |
| B. Make `chapter` nullable | migration | Semantically cleaner, but breaks the `groupId_chapter` upsert key and forces null handling through every consumer. |
| C. New `Consolidation` model | new table | Correct modelling, but duplicates the whole submission + version + annotation chain. Weeks of work, two code paths forever. |

**Status: not decided.**

## 4. Naming

Requirement: short. Two words acceptable, matching "Proposal Defense".

| Name | Assessment |
| --- | --- |
| **Consolidation** ⭐ | Standard academic term for merging chapters. Names the artifact. One word. |
| **Proposal Revision** ⭐ | Best of the client's suggestions. Noun phrase, keeps "Proposal" (correct disambiguation), "Revision" makes it a document task. |
| Chapter Consolidation | Explicit, matches the two-word pattern |
| Consolidated Chapters | Precise scope, slightly clunky |
| ~~Post Defense~~ | Ambiguous — there are two defenses. Also "Defense" is a loaded noun here (schedule, panel, verdicts). |
| ~~Post Proposal~~ | Correctly disambiguates, but it is a temporal fragment where every other row is a noun phrase. |
| ~~Manuscript~~ / ~~Full Draft~~ | Misleading — implies chapters 4–5 are included. They do not exist yet at this point. |

**Test applied:** does the name describe the *artifact* or its *position*? Every
existing row passes. The journey already renders position via the `header`
field and row order, so a positional name is redundant and goes stale.

**Recommendation: `Consolidation`.** Keep the past-tense instruction in the
upload copy, not the name.

## 5. Audit — what is affected

### 🔴 Schema
`prisma/schema.prisma` — `Chapter` enum, and the `chapter`-required /
`groupId_chapter`-unique constraint. See §3.

### 🟡 Application

| # | Area | Where |
| --- | --- | --- |
| 1 | Milestone availability (coordinator open/lock toggle) | `MilestoneAvailability.key` is `MilestoneKey`; hardcoded catalogue at `lib/actions/sections.ts` L851–856 |
| 2 | **Student journey — largest impact** | `lib/journey.ts` lists rows in **four hardcoded places**: `CHAPTER_SLUG` L11–17, `CHAPTER_KEYS` L19–24, `JOURNEY_ROWS_EMPTY` L145–154 (8 literal rows), `resolveSectionAvailability` key list L194–199, plus `buildJourneyRows` ordering |
| 3 | Slug → chapter routing | `types/milestones.ts` — `ChapterKey` union, `SLUG_TO_CHAPTER`, `CHAPTER_LABELS`, `CHAPTER_PHASE` are `Record<ChapterKey, …>`, so the compiler enforces every map be updated |
| 4 | Submission + version chain | `lib/actions/chapter.ts` — lazy `milestone.upsert` on `groupId_chapter` (L466), `milestoneSubmission.create`, versions, blob upload tokens, `MAX_SIZE_BYTES`, annotations |
| 5 | Adviser evaluation queue | `lib/actions/evaluation.ts` (24 milestone refs), `EvaluationTeamsView.tsx` (10 `.chapter` refs) |
| 6 | Group progress | `GroupProgressDrawer.tsx` (4 `.chapter` refs) — progress counts shift for every group |
| 7 | Templates | chapter-referenced in `chapter.ts`, `evaluation.ts`, `sections.ts`, `chair-dashboard.ts` — may need a template for the new milestone |
| 8 | Cache invalidation | `revalidateChapterGroup` fans out to member workspaces, group journey, coordinator section views, adviser queue. A missed target means stale UI |
| 9 | Phase gating | `CAPSTONE1_KEYS` / `CAPSTONE2_KEYS` in `lib/milestones/phase.ts` — new key goes first in `CAPSTONE2_KEYS` |
| 10 | Documentation | `docs/context/concepts/defense-lifecycle.md`, `document-versioning.md`, `docs/glossary.md`, `docs/context/guides/document-workspace.md` |

### Note on "just like the other chapter milestone"
It is not quite. The journey is hardcoded rather than data-driven, and the
chapter abstraction is a hand-written `Record` union. Both are manageable but
they are the reason this is a multi-file change.

## 6. Also unresolved

- **Does it open when Capstone 2 opens, or when the proposal defense is
  approved?** Currently assumed the former (free, via `CAPSTONE2_KEYS`).
- **Can chapters 1–3 still be revised after the consolidation is submitted?**
  This affects the adviser's review queue and whether `groupId_chapter` still
  allows a second milestone per chapter.
- **Is the submitted document final or a draft?** Determines copy, versioning
  expectations, and whether `deactivateToolAfterCreate`-style behaviour applies.

## 7. To resume

1. Decide §3 (approach A recommended).
2. Answer §6.
3. Confirm the name from §4.
4. Write the design (files touched, migration, rollout order) for approval.
5. Only then implement.