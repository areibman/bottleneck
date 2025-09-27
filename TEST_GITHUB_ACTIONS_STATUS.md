# GitHub Actions Check Status Feature - Testing Guide

## Feature Overview
The GitHub Actions check status feature allows users to view CI/CD pipeline status for each branch directly in the UI.

## Implementation Details

### Components Added
1. **CheckStatusBadge.tsx** - Displays status icons (✓ passed, ✗ failed, ⟳ running, - no checks)
2. **CheckStatusDetails.tsx** - Expandable panel showing detailed check results

### API Integration
- Extended `GitHubAPI` class with methods:
  - `getCheckRunsForRef()` - Fetches check runs for a specific commit
  - `getWorkflowRunsForBranch()` - Fetches workflow runs for a branch
  - `getBranchCheckStatus()` - Gets overall status for a branch
  - `getBatchBranchCheckStatuses()` - Batch fetches status for multiple branches

### Store Updates
- Enhanced `branchStore` with:
  - `checkStatus` field in Branch interface
  - `fetchBranchCheckStatuses()` method
  - Check status caching (2-minute cache duration)

### UI Features

#### Status Indicators
- **Green checkmark (✓)** - All checks passed
- **Red X (✗)** - One or more checks failed
- **Yellow spinner (⟳)** - Checks are running
- **Gray circle (-)** - No checks configured

#### Controls
- **Checks toggle button** - Show/hide check status badges
- **Status filter dropdown** - Filter branches by check status
- **Auto-refresh dropdown** - Set automatic refresh interval (30s, 1m, 2m, 5m)
- **Refresh button** - Manual refresh of branches and check status

#### Expandable Details
- Click on status badge to expand detailed view
- Shows individual check runs grouped by status
- Direct links to GitHub Actions logs
- Timestamps for started/completed times

#### Sorting & Filtering
- Sort branches by check status (failures first)
- Filter branches by status (All/Passed/Failed/Running/No checks)

## Testing Steps

### Prerequisites
1. Ensure you have a GitHub token configured with appropriate permissions
2. Select a repository that has GitHub Actions configured

### Test Scenarios

#### 1. Basic Display
- [ ] Navigate to Branches view
- [ ] Verify check status badges appear next to branch names
- [ ] Confirm correct icons for different statuses

#### 2. Expandable Details
- [ ] Click on a check status badge
- [ ] Verify detailed panel expands below the branch
- [ ] Check that individual checks are listed with correct status
- [ ] Verify "View on GitHub" links work

#### 3. Filtering
- [ ] Use the check status filter dropdown
- [ ] Verify branches are filtered correctly for each option
- [ ] Test "All checks", "Passed", "Failed", "Running", "No checks"

#### 4. Sorting
- [ ] Select "Check status" from Sort by dropdown
- [ ] Verify branches are sorted with failures first, then pending, none, and success

#### 5. Auto-refresh
- [ ] Select "Refresh every 30s" from auto-refresh dropdown
- [ ] Wait 30 seconds
- [ ] Verify check statuses update automatically
- [ ] Test other refresh intervals

#### 6. Manual Refresh
- [ ] Click the refresh button
- [ ] Verify both branches and check statuses are refreshed
- [ ] Check loading spinner appears during refresh

#### 7. Toggle Check Status
- [ ] Click the "Checks" toggle button
- [ ] Verify check status badges hide/show
- [ ] Confirm filter and auto-refresh options hide when disabled

## Acceptance Criteria Verification

✅ **GitHub Actions check status is displayed for each branch**
- Status badges show next to branch names
- Different icons for success/failure/pending/none states

✅ **Status updates automatically or on-demand**
- Auto-refresh intervals available (30s, 1m, 2m, 5m)
- Manual refresh button provided
- 2-minute cache to prevent excessive API calls

✅ **Users can view detailed check information**
- Expandable details panel with individual check results
- Shows check names, status, timestamps
- Groups checks by status (Running, Failed, Passed, Other)

✅ **Status indicators are clear and intuitive**
- Color-coded badges (green=success, red=failure, yellow=pending, gray=none)
- Tooltips show summary (e.g., "All 5 checks passed")
- Clear icons that match GitHub's conventions

✅ **Direct links to GitHub Actions logs are available**
- Each check in details panel has external link icon
- Links open GitHub Actions page in new tab

## Additional Features Implemented

- **Batch API calls** - Efficient fetching of status for multiple branches
- **Caching** - Reduces API calls with 2-minute cache
- **Progressive loading** - Branches load first, then check statuses
- **Error handling** - Graceful fallback if API calls fail
- **Theme support** - Works in both light and dark themes

## Performance Considerations

- Check statuses are fetched in batches of 5 branches to avoid rate limiting
- Only fetches status for visible branches (respects current filters)
- Caching prevents redundant API calls
- Auto-refresh can be disabled to reduce API usage

## Known Limitations

1. GitHub API rate limits may affect large repositories
2. Check status for very old branches might not be available
3. Private repositories require appropriate token permissions
4. Workflow runs are limited to 10 most recent per branch

## Troubleshooting

If check statuses don't appear:
1. Verify GitHub token has `repo` and `actions:read` scopes
2. Check browser console for API errors
3. Ensure repository has GitHub Actions configured
4. Try manual refresh to bypass cache