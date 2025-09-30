# 🚀 Teams Feature - 5-Minute Quickstart

Get started with Author Teams in 5 minutes!

## 🎯 What You'll Learn

1. Create your first team (2 min)
2. Use the team to filter PRs (1 min)
3. Edit and export teams (2 min)

## 📋 Prerequisites

- Bottleneck app running
- At least one repository with PRs
- Multiple authors in your PRs

## 🏃 Let's Go!

### Step 1: Open the Author Filter (30 seconds)

1. Navigate to **Pull Requests** view
2. Look at the top-right corner
3. Find the **"Authors:"** dropdown
4. Click it

You should see:
```
┌─────────────────────────┐
│ [✓] All Authors         │
│ [ ] @alice              │
│ [ ] @bob                │
└─────────────────────────┘
```

### Step 2: Create Your First Team (1 minute)

1. In the dropdown, scroll to find:
   ```
   ➕ Create New Team...
   ```

2. Click it - a dialog opens

3. Fill in:
   - **Name**: `My Team` (or something meaningful)
   - **Description**: `Test team` (optional)
   - **Color**: Pick any color you like

4. Select 2-3 members by checking boxes

5. Click **"Create Team"**

✅ **Success!** Your team is created.

### Step 3: Use Your Team (30 seconds)

1. Open the Authors dropdown again

2. You'll now see:
   ```
   TEAMS
   [ ] 🔵 My Team (3)
   ```

3. Click the checkbox next to "My Team"

4. Watch the PR list update instantly!

✅ **Success!** You just filtered by an entire team with one click.

### Step 4: Try Editing (1 minute)

1. Open the dropdown again

2. Hover over "My Team"

3. An **[Edit]** button appears

4. Click it

5. Try:
   - Changing the team name
   - Adding/removing members
   - Changing the color

6. Click **"Update Team"**

✅ **Success!** You've edited a team.

### Step 5: Export Your Team (30 seconds)

1. Click Edit on your team again

2. Scroll down to **"Import/Export Teams"**

3. Click to expand it

4. Click **"Export All Teams"**

5. A JSON file downloads

✅ **Success!** You can now share this file with teammates.

## 🎉 You're Done!

You now know how to:
- ✅ Create teams
- ✅ Filter by teams
- ✅ Edit teams
- ✅ Export teams

## 🎓 What's Next?

### For Users
→ Read the full [**Usage Guide**](TEAMS_USAGE_GUIDE.md)

### For Developers
→ Check out [**Code Examples**](TEAMS_CODE_EXAMPLES.md)

### For Technical Details
→ See [**Architecture Guide**](TEAMS_ARCHITECTURE.md)

## 💡 Pro Tips

### Tip 1: Color Code Your Teams
```
🔵 Blue   → Frontend
🔴 Red    → Backend
🟢 Green  → DevOps
🟡 Yellow → QA
```

### Tip 2: Use Descriptive Names
```
✅ Good: "Frontend Team", "Code Reviewers"
❌ Bad:  "Team 1", "Group A"
```

### Tip 3: Keep Teams Updated
- Add new members when they join
- Remove members who switch teams
- Update descriptions as needed

### Tip 4: Combine Multiple Teams
You can select multiple teams at once:
- [✓] Frontend Team
- [✓] Backend Team
- Result: See PRs from both teams!

### Tip 5: Use Team Descriptions
Add context to your teams:
- "Frontend Team - UI/UX developers"
- "Code Reviewers - Primary review squad"
- "DevOps - Infrastructure team"

## 🐛 Common Issues

### Issue: Team not appearing
**Fix**: Make sure you clicked "Create Team" button

### Issue: Members not selected
**Fix**: Verify the usernames match PR authors exactly

### Issue: Can't find dropdown
**Fix**: Look for "Authors:" in top-right of PR list

### Issue: Edit button not showing
**Fix**: Make sure you're hovering over the team

### Issue: Import failed
**Fix**: Check JSON format (export a team first to see format)

## 📱 Visual Guide

```
1. Click Author Filter
   ┌─────────────────────────────┐
   │ Authors: All            [▼] │ ← Click here
   └─────────────────────────────┘

2. Click "Create New Team"
   ┌─────────────────────────────┐
   │ ➕ Create New Team...       │ ← Click here
   └─────────────────────────────┘

3. Fill in Details
   ┌─────────────────────────────┐
   │ Name: My Team               │ ← Type name
   │ Color: [🔵]                 │ ← Pick color
   │ Members: [✓] alice          │ ← Check members
   │          [✓] bob            │
   └─────────────────────────────┘

4. Use Team
   ┌─────────────────────────────┐
   │ TEAMS                       │
   │ [✓] 🔵 My Team (2)          │ ← Click checkbox
   └─────────────────────────────┘

5. PRs Filtered!
   ┌─────────────────────────────┐
   │ Pull Requests (5)           │
   │ Only showing PRs from:      │
   │ - alice                     │
   │ - bob                       │
   └─────────────────────────────┘
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Click dropdown | Open/close filter |
| Tab | Navigate options |
| Space | Toggle checkbox |
| Escape | Close dropdown |
| Enter | Save (in dialog) |

## 📊 Benefits You'll See

### Before Teams
```
Time to filter by 5 authors: ~15 seconds
1. Click dropdown
2. Scroll to author 1
3. Click checkbox
4. Scroll to author 2
5. Click checkbox
... repeat 3 more times
```

### After Teams
```
Time to filter by 5 authors: ~1 second
1. Click dropdown
2. Click team checkbox
Done! ✨
```

### Time Saved
- **Per filter**: 14 seconds
- **Per day** (10 filters): 2 minutes 20 seconds
- **Per week**: 11 minutes 40 seconds
- **Per year**: ~10 hours saved! 🎉

## 🎯 Real-World Examples

### Example 1: Daily Standup
**Before**: Manually select each frontend developer  
**After**: Click "Frontend Team" → See all frontend PRs instantly

### Example 2: Code Review
**Before**: Remember who's on the review team  
**After**: Click "Code Reviewers" → See their workload

### Example 3: Sprint Planning
**Before**: Filter by multiple teams separately  
**After**: Select "Frontend Team" + "Backend Team" → See all sprint PRs

### Example 4: New Team Member
**Before**: They don't know the team structure  
**After**: Share exported teams → They import → Instant context

### Example 5: Department Report
**Before**: Manually gather PR data from each person  
**After**: Click "Engineering Team" → Get instant overview

## 🎨 Styling Tips

### Choose Colors That Make Sense
```
Frontend     🔵 #3b82f6 (Blue)
Backend      🔴 #ef4444 (Red)
DevOps       🟢 #10b981 (Green)
QA           🟡 #f59e0b (Yellow)
Design       🟣 #8b5cf6 (Purple)
Product      🌸 #ec4899 (Pink)
Data         🟠 #f97316 (Orange)
Security     ⚫ #1f2937 (Dark Gray)
```

### Create Visual Consistency
- All dev teams: Blue shades
- All operations: Green shades
- All creative: Purple/Pink shades

## 📝 Team Naming Conventions

### Pattern 1: Department-Based
- Engineering Team
- Product Team
- Design Team

### Pattern 2: Function-Based
- Code Reviewers
- Release Managers
- On-Call Team

### Pattern 3: Project-Based
- Project Alpha Team
- Project Beta Team
- Infrastructure Team

### Pattern 4: Location-Based
- San Francisco Office
- Remote Team
- East Coast Team

## 🔄 Workflow Integration

### Morning Routine
1. Open Bottleneck
2. Click "My Team" filter
3. Review overnight PRs
4. Switch to "Code Reviewers"
5. Handle review requests

### Weekly Planning
1. Select "Frontend Team"
2. Review completed PRs
3. Select "Backend Team"
4. Check integration PRs
5. Plan next week's work

### Monthly Reporting
1. Export teams for backup
2. Filter by each team
3. Gather PR metrics
4. Share insights with managers

## 🎓 Advanced Usage Preview

Once you're comfortable with basics, try:

- **Combining filters**: Teams + Status + Sort
- **Creating role-based teams**: Reviewers, Maintainers
- **Using descriptions**: Add team context
- **Importing teams**: Share with new members
- **Team analytics**: Track team activity

## 📚 Further Reading

**Next Steps:**
1. ✅ You completed quickstart!
2. → Read [Usage Guide](TEAMS_USAGE_GUIDE.md) for detailed features
3. → Check [Feature Docs](TEAMS_FEATURE.md) for technical info
4. → Browse [Code Examples](TEAMS_CODE_EXAMPLES.md) for development

## 💬 Get Help

**Need assistance?**
- Check [Usage Guide](TEAMS_USAGE_GUIDE.md) troubleshooting
- Review [Feature Docs](TEAMS_FEATURE.md) technical details
- Ask your development team

## ✅ Checklist

Track your progress:

- [ ] Opened author filter dropdown
- [ ] Created first team
- [ ] Selected team to filter PRs
- [ ] Edited team (changed name or members)
- [ ] Exported team as JSON
- [ ] Tried combining multiple teams
- [ ] Added descriptive team names
- [ ] Chose meaningful colors
- [ ] Shared teams with colleague (optional)

## 🎊 Congratulations!

You're now a Teams power user! 🚀

**You learned:**
- ✅ Team creation
- ✅ Team usage
- ✅ Team editing
- ✅ Team export
- ✅ Best practices

**Time invested:** 5 minutes  
**Time you'll save:** Hours per month!

---

**Ready to dive deeper?**  
→ [Full Usage Guide](TEAMS_USAGE_GUIDE.md)  
→ [Technical Docs](TEAMS_FEATURE.md)  
→ [Code Examples](TEAMS_CODE_EXAMPLES.md)