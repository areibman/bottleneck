# Label Filter Feature - User Guide

## Quick Start

### Accessing Label Filters
The label filter is located in the top-right section of the PR list view, next to the "Sort by" and "Status" dropdowns.

```
┌─────────────────────────────────────────────────────────────┐
│ Pull Requests (42)                                          │
│                                                             │
│ [Sort by: ▼] [Labels: All ▼] [Status: ▼] [Authors: ▼]    │
└─────────────────────────────────────────────────────────────┘
```

## Filter Dropdown Layout

When you click the "Labels:" button, a dropdown appears with:

```
┌────────────────────────────────────────────────┐
│ Filter Mode: [Any (OR) ▼]      [Clear all]   │
├────────────────────────────────────────────────┤
│ [Search labels...]                             │
├────────────────────────────────────────────────┤
│ QUICK FILTERS                                  │
│ [🐛 bug (5)] [✨ feature (12)] [📝 docs (3)]  │
│ [🚨 critical (1)] [👀 needs-review (8)]       │
├────────────────────────────────────────────────┤
│ All Labels (27)                                │
│ ☐ api (15)                                     │
│ ☐ backend (12)                                 │
│ ☐ bug (5)                                      │
│ ☐ ci/cd (3)                                    │
│ ☐ documentation (3)                            │
│ ☐ enhancement (8)                              │
│ ... (scrollable)                               │
├────────────────────────────────────────────────┤
│ ☐ PRs without any labels                      │
└────────────────────────────────────────────────┘
```

## Filter Modes Explained

### OR Mode (Default) - "Any"
Shows PRs that have **at least one** of the selected labels.

**Example:**
- Selected: `bug`, `critical`
- Shows: PRs with `bug` OR `critical` OR both

**Use case:** "Show me all bugs and critical issues"

### AND Mode - "All"
Shows PRs that have **all** of the selected labels.

**Example:**
- Selected: `bug`, `backend`
- Shows: PRs that have BOTH `bug` AND `backend`

**Use case:** "Show me backend bugs only"

### NOT Mode - "Exclude"
Shows PRs that **don't have any** of the selected labels.

**Example:**
- Selected: `bug`, `documentation`
- Shows: PRs without `bug` and without `documentation`

**Use case:** "Hide bugs and docs, show me everything else"

### ONLY Mode - "Exactly"
Shows PRs that have **exactly** the selected labels (no more, no less).

**Example:**
- Selected: `bug`, `critical`
- Shows: PRs with ONLY `bug` and `critical` (not PRs with additional labels)

**Use case:** "Show me PRs tagged with exactly these labels"

## Visual Feedback

### Selected Labels Display
When labels are selected, they appear as chips below the header:

```
┌─────────────────────────────────────────────────────────────┐
│ Pull Requests (8)                                           │
├─────────────────────────────────────────────────────────────┤
│ Filtering by labels (OR):                                  │
│ [🐛 bug ×] [backend ×] [needs-review ×] [Clear all]       │
└─────────────────────────────────────────────────────────────┘
```

Click the × on any chip to remove that label from the filter.

### Label Colors
Labels maintain their GitHub colors for visual consistency:
- Red background for bugs
- Green for features
- Blue for enhancements
- Custom colors for your repository's labels

Colors automatically adjust contrast for light/dark themes.

## Common Workflows

### 1. Review Workflow
**Goal:** Find PRs that need review

**Steps:**
1. Click "Labels:" dropdown
2. Click the `👀 needs-review` quick filter
3. Or search for "review" and select matching labels

**Result:** All PRs waiting for review are displayed

### 2. Bug Triage
**Goal:** Find critical bugs

**Steps:**
1. Click "Labels:" dropdown
2. Change mode to "AND (All)"
3. Select `bug` and `critical`

**Result:** Only PRs that are both bugs AND critical

### 3. Cleanup Workflow
**Goal:** Find unlabeled PRs

**Steps:**
1. Click "Labels:" dropdown
2. Scroll to bottom
3. Check "PRs without any labels"

**Result:** All PRs that need labels

### 4. Feature Development
**Goal:** See all feature PRs except documentation

**Steps:**
1. Click "Labels:" dropdown
2. Select `feature`
3. Change mode to "NOT (Exclude)"
4. Also select `documentation`

**Result:** Feature PRs without documentation label

## Combining with Other Filters

Label filters work together with:

### Status Filters
```
Status: Open + Labels: bug
→ Shows only open bugs
```

### Author Filters
```
Author: @john + Labels: needs-review
→ Shows @john's PRs that need review
```

### All Together
```
Status: Open + Author: @john + Labels: backend, bug (AND mode)
→ Shows @john's open PRs that are both backend AND bug
```

## Tips & Tricks

1. **Quick Access**: Most common labels appear in "Quick Filters" section
2. **Search**: Type to quickly find labels instead of scrolling
3. **Count Indicators**: Number in parentheses shows how many PRs have that label
4. **Keyboard**: Type in search box without clicking it first
5. **Clear Fast**: Use "Clear all" button instead of removing chips one by one
6. **Mode First**: Select your filter mode before selecting labels for clarity
7. **Session Memory**: Your selections persist while the app is open

## Keyboard Shortcuts

- **Click dropdown**: Opens label filter
- **Type immediately**: Starts searching labels
- **Esc**: Closes dropdown
- **Click outside**: Closes dropdown

## Troubleshooting

### "No labels found"
- Your search query doesn't match any labels
- Try clearing the search box or using different keywords

### "No pull requests found"
- Your filter combination is too restrictive
- Try using OR mode instead of AND mode
- Check if you have the right status filter (Open vs Closed)

### Labels not showing colors
- Colors are fetched from GitHub and should appear automatically
- If missing, the label might not have a color set in GitHub

### Can't find a specific label
- Use the search box to filter labels
- Check spelling (search is case-insensitive)
- The label might not exist on any current PRs

## Examples

### Example 1: Weekly Bug Review
```
Mode: OR
Labels: bug, critical, urgent
Status: Open
Author: All
→ Result: All open bugs across the team
```

### Example 2: Backend Features
```
Mode: AND
Labels: backend, feature
Status: Open
Author: All
→ Result: Open backend feature PRs
```

### Example 3: Needs Attention
```
Mode: OR
Labels: needs-review, help wanted, blocked
Status: Open
Author: All
→ Result: All PRs needing team attention
```

### Example 4: Maintenance PRs
```
Mode: NOT
Labels: feature, enhancement
Status: All
Author: All
→ Result: All PRs except new features/enhancements
```

## Best Practices

1. **Consistent Labeling**: Ensure PRs are properly labeled for best results
2. **Use Quick Filters**: Save time by using predefined common labels
3. **Combine Intelligently**: Use AND mode for specific queries, OR for broad searches
4. **Regular Cleanup**: Use "No labels" filter to find and label PRs
5. **Team Standards**: Agree on label meanings with your team for consistency

## Support

For issues or feature requests related to label filtering:
1. Check this guide first
2. Review LABEL_FILTER_IMPLEMENTATION.md for technical details
3. Submit an issue with steps to reproduce any problems

---

**Note**: Label data is fetched from GitHub and reflects your repository's actual labels. The filter only shows labels that are currently in use on at least one PR.