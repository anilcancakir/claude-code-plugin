---
description: Interactive writing style analyzer — scans existing articles, documentation, and written content, interviews the developer, generates a personalized my-language skill
argument-hint: Path to writing samples or documentation directory (optional)
model: opus
---

# Setup My Language Style

You are orchestrating an interactive session to build a personalized writing and documentation style skill. Analyze the developer's existing written content, interview them about voice preferences, then generate a skill at `~/.claude/skills/my-language/` using `ac-skill-creator`.

## Core Principles

- **Read before profiling**: Extract voice patterns from actual writing samples first
- **Context-aware tone**: Documentation, articles, and commit messages each have different tone rules
- **Capture the voice, not grammar rules**: Focus on HOW the person communicates, not generic writing advice
- **Preserve authenticity**: Codify the developer's natural voice, not an idealized version

---

## Phase 1: Discovery

**Goal**: Collect representative writing samples

**Actions**:

1. If `$ARGUMENTS` contains a path, use it as the first sample source
2. Ask the developer for writing samples across categories:
   - "Share 1-3 sources that represent your writing voice"
   - Accepted formats:
     - **Article URLs**: Published blog posts, Medium articles, dev.to posts
     - **Documentation paths**: README files, docs/ directories, wiki pages
     - **File paths**: Markdown files, technical guides, tutorials
     - **Git repos**: Extract commit messages and PR descriptions automatically
3. If no samples provided, skip to Phase 3 (pure interview mode)
4. Verify paths exist via Bash (`test -f` or `test -d`). For URLs, fetch content via Bash (`curl`)

---

## Phase 2: Sample Analysis

**Goal**: Extract voice patterns and writing characteristics from samples

**Actions**:

1. Launch 1 Explore agent per sample source (max 3) in a single message for parallel execution. Each agent extracts:
   - **Voice traits**: Personal/formal, active/passive, sentence length average
   - **Opening patterns**: How sections/articles/docs begin
   - **Transition phrases**: Recurring connectors and segue patterns
   - **Code introductions**: How code blocks are introduced and followed up
   - **Closing patterns**: How content ends (abrupt, summary, call-to-action, friendly)
   - **Signature expressions**: Recurring phrases, verbal tics, characteristic word choices
   - **Structure patterns**: Section flow, heading hierarchy, list usage, callout usage
   - **Tone differences**: How tone shifts between documentation vs. articles vs. comments
   - **Rhetorical devices**: Questions, analogies, humor usage
   - **Formatting habits**: Bold/italic usage, table frequency, emoji usage
2. **Git availability check**: Before extracting git patterns, verify: run `git --version` to confirm git is installed, then `git -C <path> rev-parse --git-dir` to confirm the path is a git repo with history. If git is unavailable or path is not a git repo, skip commit/PR pattern extraction entirely and note: "Git history unavailable — skipping commit style analysis."
3. If a git repo is provided, additionally extract:
   - Commit message style (conventional commits? imperative? past tense?)
   - PR description patterns
   - Code comment voice
4. Synthesize findings into a voice profile with direct quotes from the samples
5. Present the profile:
   - "Here's your writing voice profile — confirm what's accurate and flag what to adjust"

---

## Phase 3: Style Interview

**Goal**: Confirm analyzed patterns and gather explicit voice preferences

**Actions**:

1. Present analysis findings (or start fresh if no samples analyzed)
2. Ask 4-6 targeted questions via AskUserQuestion. Adapt based on what Phase 2 revealed:

**Question 1 — Writing contexts:**

- "What types of content do you write most often?"
- Options: Technical documentation, Blog/articles, Both equally, Commit messages & PRs primarily

**Question 2 — Tone spectrum per context:**

- Present a spectrum and ask where each context falls:

```text
Formal ←―――――――――――――――――→ Casual
API docs    Guides    Tutorials    Articles    Chat
```

- "Where does your documentation sit? Where do articles sit?"

**Question 3 — Signature phrases confirmation:**

- Present detected phrases from Phase 2
- "Which of these are intentional patterns you want preserved?"
- Include "Add your own" option

**Question 4 — Opening and closing style:**

- "How do you prefer to open and close content?"
- Options for opening: Direct statement, Context + scope, Problem → solution, Personal narrative
- Options for closing: End naturally (no closing), Simple farewell, Summary + next steps, Call-to-action

**Question 5 — Grammar and polish level:**

- "How polished should your writing be?"
- Options: Natural/conversational (keep imperfections), Clean but casual, Professionally edited, Context-dependent (specify)

**Question 6 — Absolute rules and pet peeves:**

- "Any rules that must NEVER be violated in your writing?"
- Suggest candidates: No emojis, no exclamation marks, no "we" in docs, always active voice, etc.
- Free-text response

1. If the developer says "whatever you think is best", provide recommendations based on Phase 2 analysis and get explicit confirmation

---

## Phase 4: Skill Generation

**Goal**: Generate the `my-language` skill via `ac-skill-creator`

CRITICAL: Do not write skill files directly. Delegate to `ac-skill-creator`.

**Actions**:

1. Compile all gathered data into a structured brief:
   - Writing contexts and tone mapping
   - Voice characteristics table
   - Opening/transition/closing patterns with examples
   - Code introduction patterns
   - Signature phrases list
   - Structure templates per context
   - Absolute rules and anti-patterns
2. Launch `ac-skill-creator` with this prompt structure:

```markdown
Create a writing style skill named "my-language" at ~/.claude/skills/my-language/.

## Developer Voice Profile
[Insert compiled profile from Phases 2-3]

## Required Skill Structure
- SKILL.md: Main skill file with:
  - Critical Distinction table (tone routing per writing context)
  - Core Voice Characteristics table
  - Voice Rules with GOOD/BAD examples per pattern type
  - Structure Templates (one per writing context: docs, articles, commits)
  - Signature Phrases categorized by usage
  - Writing Rules (explain decisions, rhetorical questions, analogies, etc.)
  - Formatting Guidelines
- references/voice-guide.md: Tone spectrum, approved/forbidden patterns per context
- references/examples.md: Real excerpts from analyzed samples demonstrating patterns

Read ${CLAUDE_PLUGIN_ROOT}/skills/ac-skill-creator/references/language-style-template.md for the full template structure.

## Rules
- SKILL.md body under 200 lines
- Each reference file under 200 lines
- Use imperative mood in rules, but preserve developer's natural voice in examples
- Include GOOD/BAD examples for every voice rule
- Capture authentic signature phrases, not manufactured ones
```

1. Review the generated output for voice accuracy

**Error Recovery**: If ac-skill-creator produces empty or malformed output, retry once with a simplified prompt (reduce to core voice traits + 3 signature phrases only). If still fails, present raw interview findings to user and offer to write the skill file manually via direct Write.

---

## Phase 5: Review & Install

**Goal**: Present the generated skill, iterate, and install

CRITICAL: Do not install without user approval.

**Actions**:

1. Present the generated `SKILL.md` to the developer
2. Highlight key sections: Voice Characteristics, context count, signature phrases
3. Use AskUserQuestion for review:
   - question: "Does this sound like you? What needs adjustment?"
   - header: "Review"
   - options:
     - Approve — "Install as shown"
     - Adjust — "I want to change specific sections"
     - Restart — "Start the interview over from scratch"
   - If "Approve" → proceed to install
   - If "Adjust" → ask what to change via AskUserQuestion, update via `ac-skill-creator`, re-present
   - If "Restart" → return to Phase 3
4. Once approved, write files to `~/.claude/skills/my-language/`:
   - Create directory: `mkdir -p ~/.claude/skills/my-language/references`
   - Write `SKILL.md`
   - Write `references/*.md` files
5. Confirm installation:
   - "Skill installed at `~/.claude/skills/my-language/`"
   - "It will activate for all writing tasks across projects."
