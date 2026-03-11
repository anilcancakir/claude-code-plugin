---
description: Interactive coding style analyzer — scans existing projects, interviews the developer, generates a personalized my-coding skill
argument-hint: Path to a representative project (optional)
model: opus
---

# Setup My Coding Style

You are orchestrating an interactive session to build a personalized coding style skill. Analyze the developer's existing projects, interview them about preferences, then generate a skill at `~/.claude/skills/my-coding/` using `ac-skill-creator`.

## Core Principles

- **Observe before asking**: Extract patterns from code first, then confirm with the developer
- **Concreteness over abstraction**: Every rule must have a code example showing correct vs incorrect
- **Progressive depth**: Start with formatting, then architecture, then philosophy
- **Respect existing style**: The goal is to codify what the developer already does, not impose new standards

---

## Phase 1: Discovery

**Goal**: Identify representative projects to analyze

**Actions**:

1. If `$ARGUMENTS` contains a path, use it as the first project
2. Ask the developer for 1-3 project paths they consider representative of their best coding style:
   - "Which projects best represent your coding standards?"
   - "Include projects in different languages if you work across stacks"
3. If no paths provided, skip to Phase 3 (pure interview mode)
4. Verify each path exists via Bash (`test -d`)

---

## Phase 2: Project Analysis

**Goal**: Extract coding patterns from existing projects

**Actions**:

1. Launch 1 Explore agent per project (max 3) in a single message for parallel execution. Each agent analyzes:
   - **Naming**: File naming, class naming, method naming, variable conventions
   - **Structure**: Directory layout, module boundaries, layering approach
   - **Formatting**: Indentation (spaces/tabs, count), line width, trailing commas, multi-line style
   - **Types**: Type annotations, generics usage, strict typing level
   - **Documentation**: Docblock style, comment patterns, step numbering
   - **Testing**: Framework, naming convention, TDD indicators, fixture strategy
   - **Error handling**: Try/catch patterns, error propagation style
   - **Imports**: Organization, grouping, barrel files
   - **Architecture**: DI approach, service patterns, repository patterns
2. Detect languages and frameworks from config files:
   - `composer.json` → PHP/Laravel
   - `pubspec.yaml` → Dart/Flutter
   - `package.json` → Node/TypeScript
   - `pyproject.toml` / `requirements.txt` → Python
3. Synthesize findings into a unified style profile with concrete examples from the analyzed code
4. Present the profile to the developer:
   - "Here's what I found in your projects — let me know what's accurate and what to adjust"

---

## Phase 3: Style Interview

**Goal**: Confirm analyzed patterns and gather explicit preferences

**Actions**:

1. Present analysis findings (or start fresh if no projects analyzed)
2. Ask 4-6 targeted questions via AskUserQuestion. Adapt based on what Phase 2 revealed:

**Question 1 — Primary stack:**

- "What is your primary development stack?"
- Options: PHP/Laravel, Dart/Flutter, TypeScript/Node, Python, Multi-stack (specify)

**Question 2 — Non-negotiable rules:**

- "Which rules are absolute and must NEVER be violated?"
- Suggest candidates from Phase 2 findings (e.g., "Always typed", "Always documented", "TDD mandatory")
- Include "Add your own" option

**Question 3 — Architecture philosophy:**

- "How do you organize business logic?"
- Options: Thin Controllers + Fat Services, Service-Repository, Action classes, Domain-Driven, Other

**Question 4 — Formatting confirmation:**

- Present detected formatting rules and ask for corrections
- Indent size, line width, trailing commas, multi-line collections, import style

**Question 5 — Testing philosophy:**

- "How strict is your testing discipline?"
- Options: TDD (test-first always), Test-alongside (test with implementation), Post-implementation, Coverage-driven

**Question 6 — Pet peeves and extras:**

- "Any additional rules, pet peeves, or style preferences not covered above?"
- Free-text response

1. If the developer says "whatever you think is best", provide recommendations based on Phase 2 analysis and get explicit confirmation

---

## Phase 4: Skill Generation

**Goal**: Generate the `my-coding` skill via `ac-skill-creator`

CRITICAL: Do not write skill files directly. Delegate to `ac-skill-creator`.

**Actions**:

1. Compile all gathered data into a structured brief:
   - Primary language(s) and framework(s)
   - Non-negotiable rules with code examples
   - Architecture principles
   - Formatting rules table
   - Testing philosophy
   - Error handling patterns
   - Anti-patterns list
2. Launch `ac-skill-creator` with this prompt structure:

```markdown
Create a coding style skill named "my-coding" at ~/.claude/skills/my-coding/.

## Developer Profile
[Insert compiled profile from Phases 2-3]

## Required Skill Structure
- SKILL.md: Main skill file following the anilcan-coding pattern
  - North Star section (design philosophy in 2-3 sentences)
  - Non-Negotiable Rules (numbered, with CORRECT/WRONG code examples)
  - Architecture Principles table
  - Error Handling pattern
  - Formatting Quick Reference table
  - Language-Specific References section (if multi-language)
- references/: Language-specific convention files (one per primary language)
  - Include: naming, directory structure, patterns, testing, tooling
- references/anti-patterns.md: What to never do, with alternatives

Read ${CLAUDE_PLUGIN_ROOT}/skills/ac-skill-creator/references/coding-style-template.md for the full template structure.

## Rules
- SKILL.md body under 300 lines
- Each reference file under 400 lines
- Use imperative mood throughout
- Include CORRECT/WRONG code examples for every non-negotiable rule
- Trailing commas in every multi-line example
```

1. Review the generated output for completeness and accuracy

**Error Recovery**: If ac-skill-creator produces empty or malformed output, retry once with a simplified prompt (reduce interview findings to top 5 rules only). If still fails, present raw interview findings to user and offer to write the skill file manually via direct Write.

---

## Phase 5: Review & Install

**Goal**: Present the generated skill, iterate, and install

CRITICAL: Do not install without user approval.

**Actions**:

1. Present the generated `SKILL.md` to the developer
2. Highlight key sections: North Star, Non-Negotiable Rules count, language coverage
3. Use AskUserQuestion for review:
   - question: "Review this skill. What needs adjustment?"
   - header: "Review"
   - options:
     - Approve — "Install as shown"
     - Adjust — "I want to change specific sections"
     - Restart — "Start the interview over from scratch"
   - If "Approve" → proceed to install
   - If "Adjust" → ask what to change via AskUserQuestion, update via `ac-skill-creator`, re-present
   - If "Restart" → return to Phase 3
4. Once approved, write files to `~/.claude/skills/my-coding/`:
   - Create directory: `mkdir -p ~/.claude/skills/my-coding/references`
   - Write `SKILL.md`
   - Write `references/*.md` files
5. Confirm installation:
   - "Skill installed at `~/.claude/skills/my-coding/`"
   - "It will load automatically for all projects. Use path-scoped rules in individual projects to override."
