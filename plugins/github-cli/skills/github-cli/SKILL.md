---
name: github-cli
description: GitHub CLI (gh) usage patterns for Claude Code — issues, PRs, releases, actions, secrets, labels, and gh api. Teaches effective gh workflows including JSON output, jq filtering, GraphQL, scripting, and CI/CD integration. Use when the user works with GitHub issues, pull requests, releases, GitHub Actions, repository management, or any gh command. Triggers on any mention of GitHub CLI, gh, pull request creation, issue management, or GitHub API calls.
model: sonnet
---

# GitHub CLI Skill

Use `gh` (GitHub CLI) for all GitHub operations. Prefer `gh` over raw API calls, `curl`, or web browser. Every `gh` command supports `--help` for flag discovery.

## Principles

- **JSON first**: Add `--json <fields>` + `--jq <query>` for machine-readable output in scripts
- **Repo context**: Run commands from a git repo directory — `gh` auto-detects `{owner}` and `{repo}`
- **Cross-repo**: Use `-R owner/repo` flag to target a different repository
- **No interactive prompts**: Always pass `--title`, `--body`, flags explicitly — never rely on interactive prompts
- **Rate limits**: Add `sleep 1` between iterations in bulk loops

## Issues

### Create

```bash
gh issue create --title "Bug: login fails" --body "Steps to reproduce..." --label bug --assignee @me
gh issue create --title "Feature request" --body-file description.md --label enhancement --project "Roadmap"
```

### List & Filter

```bash
gh issue list                                          # Open issues (default 30)
gh issue list --state all --limit 100                  # All states, more results
gh issue list --label "bug" --assignee @me             # By label + assignee
gh issue list --search "error no:assignee sort:created-asc"  # Advanced search query
gh issue list --json number,title,labels --jq '.[].title'    # JSON + jq
```

### View & Modify

```bash
gh issue view 123                                      # View issue details
gh issue view 123 --json body,comments --jq '.comments[-1].body'  # Last comment
gh issue comment 123 --body "Working on this"
gh issue edit 123 --add-label "in-progress" --remove-label "needs-triage"
gh issue close 123 --reason completed
gh issue reopen 123
```

### Link to PR

Reference issues in PR body with `Fixes #123` or `Closes #123` — GitHub auto-closes on merge.

## Pull Requests

### Create

```bash
gh pr create --title "feat: add auth" --body "Implements OAuth2 flow" --base main
gh pr create --fill                                    # Auto-fill from commit messages
gh pr create --fill-verbose                            # Commits msg+body in description
gh pr create --draft                                   # Draft PR
gh pr create --reviewer user1,team-name --label feature --assignee @me
gh pr create --body-file pr-description.md
```

### List & Filter

```bash
gh pr list                                             # Open PRs
gh pr list --author @me                                # Your PRs
gh pr list --reviewer @me --state open                 # Awaiting your review
gh pr list --label "needs-review" --draft=false
gh pr list --search "is:open review:required"
gh pr list --json number,title,reviewDecision --jq '.[] | select(.reviewDecision == "APPROVED")'
```

### Review

```bash
gh pr review 42 --approve                              # Approve
gh pr review 42 --approve --body "LGTM, tested locally"
gh pr review 42 --request-changes --body "See inline comments"
gh pr review 42 --comment --body "Quick question about line 42"
gh pr diff 42                                          # View diff
gh pr checks 42                                        # CI status
```

### Checkout & Test

```bash
gh pr checkout 42                                      # Switch to PR branch
gh pr checkout 42 --detach                             # Detached HEAD
```

### Merge

```bash
gh pr merge 42 --squash                                # Squash merge
gh pr merge 42 --merge                                 # Merge commit
gh pr merge 42 --rebase                                # Rebase merge
gh pr merge 42 --auto --squash                         # Auto-merge when checks pass
gh pr merge 42 --squash --delete-branch                # Merge + delete branch
```

### Update & Edit

```bash
gh pr edit 42 --title "Updated title" --add-label "reviewed"
gh pr edit 42 --add-reviewer user1 --add-assignee @me
gh pr ready 42                                         # Mark draft as ready
gh pr update-branch 42                                 # Update branch from base
```

## Releases

```bash
gh release create v1.0.0 --title "v1.0.0" --generate-notes
gh release create v1.0.0 ./dist/*.tar.gz --title "v1.0.0" --notes "Bug fixes"
gh release create v1.0.0 --notes-file CHANGELOG.md --draft
gh release list
gh release view v1.0.0
gh release download v1.0.0 --dir ./downloads
gh release edit v1.0.0 --draft=false                   # Publish draft release
gh release delete v1.0.0 --yes
```

## GitHub Actions

### Trigger Workflows

```bash
gh workflow run deploy.yml                             # Trigger workflow_dispatch
gh workflow run deploy.yml -f environment=production   # With inputs
gh workflow run deploy.yml -r release/v2               # On specific branch
echo '{"env":"staging"}' | gh workflow run deploy.yml --json  # JSON inputs
```

### Monitor Runs

```bash
gh run list                                            # Recent runs
gh run list --workflow=ci.yml --limit 5                # Filter by workflow
gh run view 12345                                      # Run details
gh run view 12345 --log                                # Full logs
gh run view 12345 --log-failed                         # Only failed step logs
gh run watch 12345                                     # Watch in real-time
gh run rerun 12345                                     # Rerun failed
gh run rerun 12345 --failed                            # Rerun only failed jobs
gh run cancel 12345
```

### Download Artifacts

```bash
gh run download 12345                                  # All artifacts
gh run download 12345 --name coverage-report           # Specific artifact
gh run download 12345 --dir ./artifacts
```

## Repository

```bash
gh repo view                                           # Current repo info
gh repo view owner/repo --json description,stargazerCount
gh repo clone owner/repo
gh repo fork owner/repo --clone                        # Fork + clone
gh repo create my-project --public --clone             # Create + clone
gh repo edit --default-branch main
gh repo sync                                           # Sync fork with upstream
```

## Labels

```bash
gh label list
gh label create "priority:high" --color FF0000 --description "High priority"
gh label edit "bug" --color 00FF00
gh label delete "old-label" --yes
gh label clone source-owner/source-repo                # Clone labels from another repo
```

## Search (Cross-Repo)

```bash
gh search issues "memory leak" --repo owner/repo --state open
gh search prs "auth" --author @me --state merged
gh search repos "cli tool" --language go --stars ">100"
gh search code "handleAuth" --repo owner/repo
gh search commits "fix bug" --repo owner/repo --author user1
```

## Secrets & Variables

```bash
# Secrets (encrypted, write-only)
gh secret set API_KEY                                  # Interactive input
gh secret set API_KEY --body "sk-..."                  # Inline value
gh secret set API_KEY < secret.txt                     # From file (safer — no shell history)
gh secret list
gh secret delete API_KEY
gh secret set ORG_SECRET --org myorg --visibility all  # Org-level

# Variables (plain text, readable)
gh variable set APP_ENV --body "production"
gh variable list
gh variable delete APP_ENV
```

## gh api (REST & GraphQL)

The escape hatch for anything not covered by dedicated commands.

### REST

```bash
# GET with jq filtering
gh api repos/{owner}/{repo}/issues --jq '.[].title'

# POST with fields
gh api repos/{owner}/{repo}/issues -f title="Bug" -f body="Details" -f 'labels[]=bug'

# PATCH
gh api repos/{owner}/{repo}/issues/123 -X PATCH -f state=closed

# Pagination (all pages)
gh api repos/{owner}/{repo}/issues --paginate --jq '.[].title'

# Custom headers
gh api repos/{owner}/{repo}/readme -H 'Accept: application/vnd.github.v3.raw'
```

### GraphQL

```bash
# Query with variables
gh api graphql -F owner='{owner}' -F name='{repo}' -f query='
  query($name: String!, $owner: String!) {
    repository(owner: $owner, name: $name) {
      issues(last: 5, states: OPEN) {
        nodes { title number }
      }
    }
  }
'

# Mutation
gh api graphql -f query='
  mutation($id: ID!) {
    closeIssue(input: {issueId: $id}) {
      issue { number state }
    }
  }
' -F id="I_kwDOxxx"

# Paginated GraphQL (requires $endCursor variable + pageInfo)
gh api graphql --paginate -f query='
  query($endCursor: String) {
    viewer {
      repositories(first: 100, after: $endCursor) {
        nodes { nameWithOwner }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
'
```

### Placeholders

`{owner}`, `{repo}`, `{branch}` auto-resolve from the current git repo context.

## JSON Output & jq Patterns

Most list/view commands support `--json <fields>` + `--jq <expression>`:

```bash
# Discover available fields (pass --json without value)
gh pr list --json

# Select specific fields
gh pr list --json number,title,author --jq '.[] | "\(.number) \(.title) by \(.author.login)"'

# Filter with conditions
gh issue list --json number,labels --jq '[.[] | select(.labels | length > 0)]'

# Count by label
gh issue list --state all --limit 500 --json labels --jq '[.[].labels[].name] | group_by(.) | map({name: .[0], count: length}) | sort_by(-.count)'
```

## Status Dashboard

```bash
gh status                                              # All: assigned issues, PRs, review requests, mentions
gh status -o myorg                                     # Filter to org
gh status -e owner/noisy-repo                          # Exclude specific repos
```

## Scripting Patterns

### Bulk Operations

```bash
# Close all issues with a label
gh issue list --label "wontfix" --json number --jq '.[].number' | \
  while read num; do gh issue close "$num" --reason "not planned"; sleep 1; done

# Add label to all open PRs
gh pr list --json number --jq '.[].number' | \
  while read num; do gh pr edit "$num" --add-label "reviewed"; sleep 1; done
```

### Conditional Logic

```bash
# Merge PR only if all checks pass
if gh pr checks 42 --json state --jq 'all(.state == "SUCCESS")' | grep -q true; then
  gh pr merge 42 --squash
fi
```

### PR Comments from API

```bash
# Read all comments on a PR
gh api repos/{owner}/{repo}/pulls/42/comments --jq '.[] | "\(.user.login): \(.body)"'

# Post a comment
gh api repos/{owner}/{repo}/issues/42/comments -f body="Automated comment from script"
```

## Common Mistakes

- **Missing `--json` fields**: Run `gh <cmd> --json` with no value to see available fields
- **Interactive prompts in scripts**: Always pass `--title`, `--body`, `--yes` explicitly
- **Rate limiting in loops**: Add `sleep 1` between API calls in bulk operations
- **Search exclusion syntax**: Use `--` before query on Unix: `gh search issues -- "-label:bug"`
- **Draft filter**: `--draft` without value means "only drafts", use `--draft=false` for non-drafts
- **PR vs Issue numbers**: GitHub shares the number space — PR #42 and Issue #42 cannot coexist
