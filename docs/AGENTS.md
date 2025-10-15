The way to link PRs to an issue is via changing the root comment in a PR to reference the issue number. i.e.:

| Method | API | Auto-closes? | UI-equivalent sidebar link? |
|--------|-----|--------------|----------------------------|
| Fixes #123 in PR body | REST | ✅ Yes | ✅ Appears under "Linked issues" |
| "Link issue" via sidebar | GraphQL (internal) | ❌ No | ✅ Appears under "Linked issues" |
| Add comment with #123 | REST | ❌ No | ✅ Appears in timeline only |
| Add assignee via /assignees | REST | ❌ No | ❌ Only changes assignees |
