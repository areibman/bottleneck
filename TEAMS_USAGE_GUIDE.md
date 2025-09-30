# Author Teams - Quick Start Guide

## What Are Author Teams?

Author Teams allow you to group multiple GitHub users together and filter PRs by entire teams with a single click. This is perfect for:
- Frontend/Backend teams
- Code review groups
- Cross-functional squads
- Department divisions

## Quick Start

### Step 1: Create Your First Team

1. Navigate to the **Pull Requests** view
2. Click the **Authors** filter dropdown (top right)
3. Click **"Create New Team..."**
4. Fill in the team details:
   - **Team Name**: e.g., "Frontend Team"
   - **Description**: e.g., "UI/UX developers"
   - **Color**: Pick a color for visual identification
   - **Members**: Select team members from the list

5. Click **"Create Team"**

### Step 2: Use Your Team

1. Open the **Authors** filter dropdown
2. Find your team under the "TEAMS" section
3. Click the checkbox next to the team name
4. All team members are now selected!
5. The PR list updates to show only PRs from those authors

### Step 3: Advanced Features

#### Edit a Team
- Hover over a team in the dropdown
- Click the **"Edit"** button that appears
- Modify members, name, color, or description
- Click **"Update Team"**

#### Delete a Team
- Click "Edit" on a team
- Click the **"Delete Team"** button at the bottom
- Confirm the deletion

#### Export Teams
- Open the team dialog (create or edit)
- Expand **"Import/Export Teams"**
- Click **"Export All Teams"**
- Save the JSON file to share or backup

#### Import Teams
- Open the team dialog
- Expand **"Import/Export Teams"**
- Paste the JSON data
- Click **"Import"**

## Visual Guide

```
┌─────────────────────────────────────────────┐
│ Authors: All                            ▼   │  ← Click to open
└─────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────┐
│ ☑ All Authors                               │
│ ─────────────────────────────────────────── │
│ TEAMS                                       │
│ ☐ 🟦 Frontend Team (5)           [Edit]    │  ← Your teams
│ ☑ 🟥 Backend Team (8)            [Edit]    │
│ ☐ 🟩 DevOps (3)                  [Edit]    │
│ ➕ Create New Team...                       │  ← Create new
│ ─────────────────────────────────────────── │
│ INDIVIDUAL AUTHORS                          │
│ ☐ @alice                                    │
│ ☑ @bob                                      │  ← Individual
│ ☐ @charlie                                  │     authors
│ ...                                         │
└─────────────────────────────────────────────┘
```

## Tips & Tricks

### 1. Color Coding
Choose distinct colors for different types of teams:
- 🔵 Blue: Frontend teams
- 🔴 Red: Backend teams
- 🟢 Green: DevOps teams
- 🟡 Yellow: QA teams
- 🟣 Purple: Design teams

### 2. Partial Selection
If you select some (but not all) members of a team individually:
- The team checkbox shows an **indeterminate state** (-)
- Click the team checkbox once to select all members
- Click again to deselect all members

### 3. Combining Filters
You can combine teams with other filters:
- Select multiple teams at once
- Mix teams with individual authors
- Use with status filters (Open, Draft, etc.)

### 4. Keyboard Navigation
- Use **Tab** to navigate between checkboxes
- Use **Space** to toggle selections
- Use **Escape** to close the dropdown

### 5. Search in Team Dialog
When creating/editing teams with many authors:
- Use the search box to filter authors
- Type part of a username to find them quickly

### 6. Team Descriptions
Add helpful descriptions to teams:
- Remind yourself what each team is for
- Note any special criteria for membership
- Add last updated date or owner info

## Common Use Cases

### Use Case 1: Review Frontend PRs
**Team**: Frontend Team (alice, bob, charlie)
**Action**: Click team checkbox in filter
**Result**: See all PRs from frontend developers

### Use Case 2: Check DevOps Status
**Team**: DevOps (dave, eve)
**Action**: Click team + filter by "Merged" status
**Result**: See all merged DevOps PRs

### Use Case 3: Code Review Squad
**Team**: Code Reviewers (alice, bob, frank)
**Action**: Click team to see their review activity
**Result**: Monitor reviewer workload

### Use Case 4: Multi-Team View
**Teams**: Frontend Team + Backend Team
**Action**: Select both teams
**Result**: See all PRs from both teams

### Use Case 5: Team Onboarding
**Action**: Export your teams as JSON
**Share**: Send JSON to new team members
**Result**: They import and have same teams instantly

## Troubleshooting

### Q: I don't see my team in the dropdown
**A**: Make sure you saved the team by clicking "Create Team" or "Update Team"

### Q: Team members aren't being selected
**A**: Verify the usernames in the team match exactly with PR authors

### Q: Can I have a team with just one member?
**A**: Yes! This can be useful for frequently filtering by specific individuals

### Q: My team disappeared after refresh
**A**: Teams are stored locally. Check if your browser cleared storage or if you're in a different browser profile

### Q: Import isn't working
**A**: Ensure the JSON format is correct. Try exporting a team first to see the expected format

### Q: Can I undo a team deletion?
**A**: No, but if you have an export, you can reimport the team

## JSON Export Format

Example team structure for import/export:

```json
[
  {
    "id": "team_1234567890_abc123",
    "name": "Frontend Team",
    "description": "UI and UX developers",
    "members": ["alice", "bob", "charlie"],
    "color": "#3b82f6",
    "icon": "🏢",
    "createdAt": "2025-09-30T10:00:00.000Z",
    "lastUsed": "2025-09-30T15:30:00.000Z"
  },
  {
    "id": "team_0987654321_xyz789",
    "name": "Backend Team",
    "description": "API and database developers",
    "members": ["dave", "eve", "frank", "grace", "henry"],
    "color": "#ef4444",
    "icon": "🏢",
    "createdAt": "2025-09-30T10:00:00.000Z"
  }
]
```

## Best Practices

1. **Keep team names short and descriptive**
   - ✅ "Frontend Team"
   - ❌ "The Team Responsible for All Frontend Development and UI/UX Work"

2. **Update teams regularly**
   - Add new members when they join
   - Remove members who move to other teams

3. **Use consistent naming**
   - All teams end with "Team": "Frontend Team", "Backend Team"
   - Or all teams are descriptive: "UI Developers", "API Engineers"

4. **Export backups**
   - Export your teams monthly
   - Keep a backup in your team's shared drive

5. **Share with the team**
   - Export and share with new team members
   - Keep a canonical version in your team's documentation

## Keyboard Shortcuts

- **Click dropdown**: Opens/closes author filter
- **Tab**: Navigate through options
- **Space**: Toggle checkbox
- **Escape**: Close dropdown
- **Enter**: (In dialog) Save team
- **Ctrl/Cmd + F**: (In dialog) Focus search box

## Need Help?

If you encounter issues or have suggestions for improvements:
1. Check this guide for troubleshooting tips
2. Review the TEAMS_FEATURE.md for technical details
3. Report issues to your development team
4. Share feature requests for future enhancements

---

**Happy Team Filtering! 🎉**