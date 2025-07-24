# Work on GitHub Issue

## Instructions

1. Fetch issue details: `gh issue view $ARGUMENTS`
2. Analyze the codebase related to this issue
3. Create task plan in `/docs/issues/XXX-issue-$ARGUMENTS.md`
4. Create feature branch: `git checkout -b issue-$ARGUMENTS-<brief-description>`
5. Implement the solution step by step
6. Run tests after implementation
7. Commit with: `git add . && git commit -m "fix: <description> (#$ARGUMENTS)"`
8. Create PR: `gh pr create --title "Fix: <description> (#$ARGUMENTS)" --body "Closes #$ARGUMENTS"`

## Workflow

- Keep changes focused on the issue
- Write clear commit messages
- Update documentation if needed
- Add tests for new functionality