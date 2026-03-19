# PRD Template

Two canonical templates for `/ac:ideate` generation. Product-focused — define WHAT, never HOW.

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

## Task Files

Phases now map to task files with `phase:` frontmatter field. Each phase decomposes into N individual task files stored in the tasks directory.

Generate task files following the format defined in `${CLAUDE_PLUGIN_ROOT}/skills/ac-skill-creator/references/pm-base.md`. Key rules:

- Filename: `$prdName-phase-N-$taskSlug.md` (e.g., `myapp-phase-1-setup-auth.md`)
- Frontmatter must include `project: $prdName` and `phase: N` to link tasks back to the PRD
- Each task must be independently plannable — one ac:plan cycle per task
- Split any scope exceeding size L into multiple tasks within the same phase
- Do NOT include `### Research Summary` — forces ac:plan to run fresh codebase research
