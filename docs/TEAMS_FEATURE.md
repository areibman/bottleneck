# Teams Feature Documentation

## Overview
The Teams feature allows users to pre-save combinations of authors that can be quickly selected from the author filter dropdown. This is particularly useful for filtering PRs and issues by commonly used groups like frontend team, backend team, or specific reviewer groups.

## Features

### 1. Team Management
- **Create Teams**: Define custom teams with multiple authors
- **Save Teams**: Store team configurations locally using browser storage
- **Edit Teams**: Modify team members, names, descriptions, colors, and icons
- **Delete Teams**: Remove teams that are no longer needed
- **Import/Export**: Share team configurations with others

### 2. Team Selection in Filters
- **Quick Filter**: Select entire teams from the author dropdown with one click
- **Visual Indicators**: Teams are displayed with custom icons and member counts
- **Combined Filtering**: Can select multiple teams and individual authors simultaneously
- **Hover Preview**: See team members by hovering over team names

### 3. Team Customization
- **Name**: Give meaningful names to teams (e.g., "Frontend Team", "Code Reviewers")
- **Description**: Add optional descriptions for context
- **Icon**: Choose from predefined emoji icons for visual identification
- **Color**: Select custom colors for team badges
- **Members**: Add or remove GitHub usernames

## How to Use

### Creating a New Team

1. Click on the author filter dropdown in either PR List or Issues view
2. Click "Create New Team" or "Manage Teams"
3. In the modal:
   - Enter a team name
   - Optionally add a description
   - Select an icon and color
   - Search and add team members
   - Click "Create Team"

### Selecting Teams for Filtering

1. Open the author filter dropdown
2. Teams appear at the top with their icons and member counts
3. Click on a team to toggle selection
4. Selected teams show a checkmark
5. All members of selected teams will be included in the filter

### Managing Existing Teams

1. Click "Manage Teams" in the author dropdown
2. In the Teams tab:
   - View all existing teams
   - Click Edit icon to modify a team
   - Click Delete icon to remove a team
   - Use Search to find specific teams

### Importing/Exporting Teams

#### Export Teams
1. Open Team Management modal
2. Click "Export" button
3. Teams will be downloaded as a JSON file

#### Import Teams
1. Open Team Management modal
2. Click "Import" button
3. Select a previously exported JSON file
4. Teams will be added (duplicates are ignored)

## Data Structure

Teams are stored with the following structure:
```typescript
interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  color?: string;
  icon?: string;
  createdAt: string;
  lastUsedAt?: string;
  isDefault?: boolean;
}

interface TeamMember {
  login: string;
  avatarUrl?: string;
  name?: string;
}
```

## Storage

Teams are persisted using browser local storage via Zustand's persist middleware. This means:
- Teams are saved automatically
- Teams persist across browser sessions
- Teams are specific to each browser/device
- Clearing browser data will remove saved teams

## UI Components

### TeamAuthorDropdown
Enhanced dropdown component that combines team and individual author selection.

**Location**: `/src/renderer/components/teams/TeamAuthorDropdown.tsx`

**Props**:
- `availableAuthors`: List of authors from current PRs/issues
- `selectedAuthors`: Currently selected individual authors
- `onAuthorToggle`: Callback for author selection changes
- `onTeamSelect`: Optional callback for team selection

### TeamManagementModal
Modal component for creating, editing, and managing teams.

**Location**: `/src/renderer/components/teams/TeamManagementModal.tsx`

**Features**:
- Tabbed interface (List, Create, Edit)
- Search functionality
- Import/Export buttons
- Team member management with search

## Integration Points

The teams feature is integrated into:

1. **PR List View** (`/src/renderer/views/PRListView.tsx`)
   - Replaces standard author dropdown
   - Filters PRs by team members

2. **Issues View** (`/src/renderer/views/IssuesView.tsx`)
   - Replaces standard author dropdown
   - Filters issues by team members

3. **Teams Store** (`/src/renderer/stores/teamsStore.ts`)
   - Manages team state
   - Handles CRUD operations
   - Provides selection utilities

## Benefits

1. **Time Saving**: One click instead of selecting multiple authors
2. **Consistency**: Same groupings across sessions
3. **Organization**: Named teams are easier to understand than username lists
4. **Collaboration**: Teams reflect actual organizational structure
5. **Flexibility**: Can quickly switch between different team views

## Future Enhancements

Potential improvements for the teams feature:
- Sync teams across devices (requires backend)
- Auto-suggest team members based on PR/issue history
- Team-based notifications
- Team performance metrics
- Integration with GitHub Teams API
- Keyboard shortcuts for quick team selection