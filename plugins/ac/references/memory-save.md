# Memory Save — Shared Reference

Directives for when and what to save to CC's native memory system after key workflows. ac does not teach CC how memory works — CC already knows. This reference defines WHAT to save and WHEN. Cap: max 2 memories per workflow, 0 if nothing worth saving. Save automatically and show the user a brief summary of what was saved.

---

## Execute

Fires after a plan completes successfully (all steps verified, commit done).

- Save architectural decisions — new patterns introduced, significant design choices made, or constraints discovered during execution
- Save codebase evolution — new modules, layers, or conventions added that future plans should be aware of
- Skip routine work — CRUD implementations, minor bug fixes, and config tweaks do not warrant a memory

---

## Commit

Fires after `/ac:commit` completes for significant changes only.

- Save only for architecture introductions, new project-wide patterns, or major refactors that shift how the codebase is structured
- Save the "why" behind the change — the decision rationale, not the change itself
- Skip for routine commits — style fixes, dependency bumps, small feature additions, and incremental work

---

## Ideate

Fires after `/ac:ideate` produces a finalized task document.

- Save product or technical direction decisions that emerged during the Socratic interview — pivots, scope constraints, or non-obvious trade-offs chosen
- Save validated assumptions — facts about the codebase or user needs confirmed during ideation that would otherwise require re-discovery
- Skip if ideation was exploratory and produced no firm decisions

---

## Investigation

Fires after a hairy investigation concludes (3 read-only cycles completed). Does not fire after surgical fixes.

- Save the root cause — what the bug or failure actually was, not the symptom
- Save codebase insight — hidden coupling, surprising behavior, or systemic patterns discovered during tracing that are not obvious from the code
- Skip if the investigation was inconclusive or produced no actionable insight
