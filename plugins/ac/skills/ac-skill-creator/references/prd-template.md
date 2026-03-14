# PRD Template

Two canonical templates for `/ac:prd` generation. Product-focused — define WHAT, never HOW.

## Overview Template

Generate as `overview.md` in the PRD output directory.

```markdown
# [Project Name] — PRD

**Date**: [YYYY-MM-DD]

## Vision

[2-3 sentence product vision. What does the world look like when this ships?]

## Target Users

[Who uses this? Describe 1-3 personas or user segments.]

## Core Value

[What problem does this solve? Why now?]

## Requirements

| ID | Title | Description | Priority | Scope |
|----|-------|-------------|----------|-------|
| REQ-001 | [title] | [what, not how] | must | v1 |
| REQ-002 | [title] | [description] | should | v1 |
| REQ-003 | [title] | [description] | could | future |
| REQ-004 | [title] | [description] | — | out-of-scope |

Priority: must / should / could. Scope: v1 / future / out-of-scope.

## Constraints (if applicable)

- **Business**: [budget, timeline, compliance, partnerships]
- **Technical**: [platform limits, integration requirements, data constraints]

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| [key decision from interview/challenge] | [why this over alternatives] |

## Gaps & Risks

| Severity | Description | Mitigation |
|----------|-------------|------------|
| CRITICAL | [identified gap or risk] | [mitigation plan] |
| IMPORTANT | [gap or risk] | [mitigation] |
| MINOR | [gap or risk] | [mitigation] |

## Phases

- [ ] Phase 1: [Short Title] — pending
- [ ] Phase 2: [Short Title] — pending
- [ ] Phase 3: [Short Title] — pending (if applicable)
```

## Phase Template

Generate as `phase-N-$shortTitle.md` for each phase. Filename: `phase-1-core-auth.md`.

```markdown
# Phase [N]: [Short Title]

## Goal

[What this phase delivers. Product perspective — observable user/system outcome.]

## Scope

[Which features, modules, or user flows this phase covers.]

## Requirements

- REQ-001: [title]
- REQ-002: [title]

## Acceptance Criteria

- [Observable product behavior, not implementation detail]
- [User can do X / System produces Y]
- [Measurable outcome]

## Dependencies (if applicable)

- Phase [N-1]: [title] must be complete

## Out of Scope

- [What this phase explicitly does NOT cover]
- [Deferred to Phase N+1 or future]
```
