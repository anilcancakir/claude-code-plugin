---
description: "Interactive writing style analyzer — scans existing content, interviews developer, generates my-language skill"
effort: high
argument-hint: Path to writing samples or documentation directory (optional)
---

# Setup My Language Style

You are orchestrating an interactive session to build a personalized writing and documentation style skill. Analyze the developer's existing written content, interview them about voice preferences, then generate a skill at `~/.claude/skills/my-language/` using `skill-creator`.

## Core Principles

- **Read before profiling**: Extract voice patterns from actual writing samples first
- **Context-aware tone**: Docs, articles, and commit messages each have different tone rules
- **Capture the voice, not grammar rules**: HOW the person communicates, not generic writing advice
- **Preserve authenticity**: Codify the developer's natural voice, not an idealized version

---

## Phase 1: Discovery

1. If $ARGUMENTS is a path → use as first sample source
2. Ask for writing samples across categories:
   - "Share 1-3 sources that represent your writing voice"
   - Accepted formats:
     - **Article URLs**: Published blog posts, Medium articles, dev.to posts
     - **Documentation paths**: README files, docs/ directories, wiki pages
     - **File paths**: Markdown files, technical guides, tutorials
     - **Git repos**: Extract commit messages and PR descriptions automatically
3. If no samples provided → skip to Phase 3 (pure interview mode)
4. Verify paths via Bash (`test -f` or `test -d`). For URLs → fetch via Bash (`curl`)

---

## Phase 2: Sample Analysis

1. For each sample source (max 3), use Glob, Grep, and Read directly in the main context — no subagents. Extract:
   - **Voice traits**: Personal/formal, active/passive, sentence length average
   - **Opening patterns**: How sections/articles/docs begin
   - **Transition phrases**: Recurring connectors and segue patterns
   - **Code introductions**: How code blocks are introduced and followed up
   - **Closing patterns**: Abrupt, summary, call-to-action, or friendly
   - **Signature expressions**: Recurring phrases, verbal tics, characteristic word choices
   - **Structure patterns**: Section flow, heading hierarchy, list usage, callout usage
   - **Tone differences**: How tone shifts between documentation vs. articles vs. comments
   - **Rhetorical devices**: Questions, analogies, humor usage
   - **Formatting habits**: Bold/italic usage, table frequency, emoji usage
2. Git availability check: run `git --version` to confirm git is installed, then `git -C <path> rev-parse --git-dir` to confirm the path is a git repo. If unavailable → skip commit/PR pattern extraction and note: "Git history unavailable — skipping commit style analysis."
3. If a git repo is provided, additionally extract:
   - Commit message style (conventional commits? imperative? past tense?)
   - PR description patterns
   - Code comment voice
4. Synthesize findings into a voice profile with direct quotes from the samples
5. Present: "Here's your writing voice profile — confirm what's accurate and flag what to adjust"

---

## Phase 3: Style Interview

1. Present analysis findings (or start fresh if no samples analyzed)
2. Ask 4-6 targeted questions via AskUserQuestion. Adapt based on Phase 2 findings:

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

3. If developer says "whatever you think is best" → provide recommendations from Phase 2 and get explicit confirmation

---

## Phase 4: Skill Generation

CRITICAL: Do not write skill files directly. Delegate to `skill-creator`.

1. Compile all gathered data into a structured brief:
   - Writing contexts and tone mapping
   - Voice characteristics table
   - Opening/transition/closing patterns with examples
   - Code introduction patterns
   - Signature phrases list
   - Structure templates per context
   - Absolute rules and anti-patterns
2. Launch `skill-creator` with this prompt:

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

Read ${CLAUDE_PLUGIN_ROOT}/references/language-style-template.md for the full template structure.

## Rules
- SKILL.md body under 200 lines
- Each reference file under 200 lines
- Use imperative mood in rules, but preserve developer's natural voice in examples
- Include GOOD/BAD examples for every voice rule
- Capture authentic signature phrases, not manufactured ones
```

3. Review the generated output for voice accuracy

**Error Recovery**: If skill-creator produces empty or malformed output → retry once with a simplified prompt (core voice traits + 3 signature phrases only). If still fails → present raw findings to user and offer direct Write fallback.

---

## Phase 5: Review & Install

CRITICAL: Do not install without user approval.

1. Present the generated `SKILL.md` to the developer
2. Highlight key sections: Voice Characteristics, context count, signature phrases
3. Call AskUserQuestion with these exact parameters:
   ```json
   {
     "questions": [{
       "question": "Does this sound like you? What needs adjustment?",
       "header": "Review",
       "options": [
         {"label": "Approve (Recommended)", "description": "Install as shown."},
         {"label": "Adjust", "description": "I want to change specific sections."},
         {"label": "Restart", "description": "Start the interview over from scratch."}
       ]
     }]
   }
   ```
   - If "Approve" → proceed to install
   - If "Adjust" → ask what to change via AskUserQuestion, update via `skill-creator`, re-present
   - If "Restart" → return to Phase 3
4. Once approved, write files to `~/.claude/skills/my-language/`:
   - Create directory: `mkdir -p ~/.claude/skills/my-language/references`
   - Write `SKILL.md`
   - Write `references/*.md` files
5. Confirm: "Skill installed at `~/.claude/skills/my-language/`. It will activate for all writing tasks across projects."
