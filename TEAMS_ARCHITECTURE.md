# Team Management Feature - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application Layer                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              PRListView Component                       │    │
│  │  - Displays PR list with filters                       │    │
│  │  - Manages author dropdown UI                          │    │
│  │  - Integrates teams into filter logic                  │    │
│  └───────────┬────────────────────────────────┬───────────┘    │
│              │                                 │                │
│              │ Uses                            │ Renders        │
│              ▼                                 ▼                │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │   useTeamsStore()    │         │ TeamManagementDialog │    │
│  │  - Team CRUD ops     │◄────────│  - Create/Edit UI    │    │
│  │  - State management  │  Uses   │  - Import/Export     │    │
│  │  - Export/Import     │         │  - Member selection  │    │
│  └──────────┬───────────┘         └──────────────────────┘    │
│             │                                                   │
│             │ Persists to                                      │
│             ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Storage Layer                              │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐   │   │
│  │  │  Zustand Persistence │  │  Electron Settings   │   │   │
│  │  │  (localStorage)      │  │  (Native Store)      │   │   │
│  │  └──────────────────────┘  └──────────────────────┘   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
User Action: Click "Create New Team"
│
├─► PRListView.handleCreateTeam()
│   │
│   └─► Sets showTeamDialog = true
│
├─► TeamManagementDialog renders
│   │
│   ├─► User fills form (name, members, color)
│   │
│   └─► User clicks "Create Team"
│       │
│       └─► TeamManagementDialog.handleSave()
│           │
│           └─► useTeamsStore.createTeam(teamData)
│               │
│               ├─► Generate unique ID
│               ├─► Add timestamp
│               ├─► Update Zustand state
│               └─► Persist to Electron settings
│
└─► Dialog closes, team appears in dropdown
```

## Data Flow Diagram

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │ Interacts
       ▼
┌──────────────────────┐
│  PRListView (UI)     │
│  - Author Dropdown   │
└──────┬───────────────┘
       │ Reads/Writes
       ▼
┌─────────────────────────────┐
│  teamsStore (State)         │
│  - teams: AuthorTeam[]      │
│  - createTeam()             │
│  - updateTeam()             │
│  - deleteTeam()             │
└──────┬──────────────────────┘
       │ Syncs
       ▼
┌─────────────────────────────┐
│  Storage (Persistence)      │
│  - localStorage (browser)   │
│  - Electron Store (desktop) │
└─────────────────────────────┘
```

## State Management

### Team Store State
```typescript
{
  teams: AuthorTeam[]  // Array of all teams
}
```

### Team Object Structure
```typescript
{
  id: "team_1234567890_abc123",
  name: "Frontend Team",
  description: "UI/UX developers",
  members: ["alice", "bob", "charlie"],
  color: "#3b82f6",
  icon: "🏢",
  createdAt: "2025-09-30T10:00:00.000Z",
  lastUsed: "2025-09-30T15:30:00.000Z"
}
```

## Filter Logic Flow

```
User selects team in dropdown
│
├─► PRListView.handleTeamToggle(teamId)
│   │
│   ├─► Find team by ID
│   ├─► Mark team as used
│   │
│   └─► Update selected authors:
│       │
│       ├─► If all members selected:
│       │   └─► Remove all members
│       │
│       └─► If not all selected:
│           └─► Add all members
│
├─► setPRListFilters() updates
│   │
│   └─► selectedAuthors = [...members]
│
└─► PRs filter updates automatically
    │
    └─► Show only PRs from selected authors
```

## Component Hierarchy

```
App
└── Router
    └── PRListView
        ├── TeamManagementDialog (modal)
        │   ├── Form inputs (name, description)
        │   ├── Color picker
        │   ├── Member selection list
        │   │   └── Individual checkboxes
        │   └── Action buttons
        │       ├── Create/Update
        │       ├── Delete
        │       └── Cancel
        │
        └── Author Dropdown
            ├── "All Authors" option
            ├── Teams section
            │   └── For each team:
            │       ├── Checkbox (indeterminate support)
            │       ├── Color indicator
            │       ├── Name & member count
            │       └── Edit button (on hover)
            ├── "Create New Team" button
            └── Individual Authors section
                └── For each author:
                    ├── Checkbox
                    ├── Avatar
                    └── Username
```

## Event Flow

### Creating a Team
```
1. User clicks "Create New Team..."
2. Dialog opens (showTeamDialog = true)
3. User enters team details
4. User selects members
5. User clicks "Create Team"
6. Validation runs
7. Store creates team
8. Storage persists team
9. Dialog closes
10. Dropdown re-renders with new team
```

### Using a Team
```
1. User opens author dropdown
2. Teams section renders
3. User clicks team checkbox
4. handleTeamToggle() executes
5. Team members added to selectedAuthors
6. markTeamAsUsed() updates timestamp
7. Dropdown stays open
8. PR list re-filters
9. Only matching PRs show
```

### Editing a Team
```
1. User hovers over team
2. "Edit" button appears
3. User clicks "Edit"
4. Dialog opens with team data pre-filled
5. User modifies fields
6. User clicks "Update Team"
7. Store updates team
8. Storage syncs changes
9. Dialog closes
10. Dropdown shows updated team
```

## Persistence Strategy

```
┌─────────────────────────────────────────────────┐
│            On Team Change Event                  │
└────────────────┬────────────────────────────────┘
                 │
                 ├─► Update Zustand State
                 │   (Immediate - React re-renders)
                 │
                 ├─► Save to localStorage
                 │   (Via Zustand persist middleware)
                 │
                 └─► Save to Electron Store
                     (Via window.electron.settings.set())
                     
┌─────────────────────────────────────────────────┐
│            On App Initialization                 │
└────────────────┬────────────────────────────────┘
                 │
                 ├─► Load from localStorage
                 │   (Zustand rehydration)
                 │
                 └─► Load from Electron Store
                     (Override with server data)
```

## Error Handling

```
┌─────────────────────────────────────────────────┐
│              Error Scenarios                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Empty Team Name                             │
│     → Show alert: "Please provide a team name"  │
│                                                  │
│  2. No Members Selected                         │
│     → Show alert: "Select at least one member"  │
│                                                  │
│  3. Import Invalid JSON                         │
│     → Show alert: "Failed to import teams"      │
│     → Log error to console                      │
│                                                  │
│  4. Storage Write Failure                       │
│     → Log error to console                      │
│     → Team still saved in Zustand              │
│     → User unaffected                           │
│                                                  │
│  5. Team Not Found                              │
│     → Silently return from handler              │
│     → No action taken                           │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Performance Considerations

### Optimization Points

1. **Memoization**
   ```typescript
   const selectedAuthors = useMemo(
     () => new Set(prListFilters.selectedAuthors),
     [prListFilters.selectedAuthors]
   );
   ```

2. **Callback Memoization**
   ```typescript
   const handleTeamToggle = useCallback(
     (teamId: string) => { /* ... */ },
     [teams, authors, markTeamAsUsed, setPRListFilters]
   );
   ```

3. **Efficient Filtering**
   ```typescript
   // O(1) lookup using Set instead of Array.includes()
   const isSelected = selectedAuthors.has(author.login);
   ```

4. **Lazy Dialog Rendering**
   ```typescript
   {showTeamDialog && <TeamManagementDialog />}
   // Only render when needed
   ```

### Scalability

- **Small teams** (5-10 members): Instant performance
- **Medium teams** (10-50 members): Negligible impact
- **Large teams** (50+ members): Still performant due to Set operations
- **Many teams** (20+ teams): Dropdown may scroll, but fast

## Security Considerations

1. **Input Validation**
   - Team names are trimmed
   - Member arrays validated on import
   - JSON parsed safely with try/catch

2. **XSS Prevention**
   - React automatically escapes all rendered content
   - No dangerouslySetInnerHTML used

3. **Local Storage**
   - Teams stored locally only
   - No sensitive data transmitted
   - User controls their own data

## Testing Strategy

### Unit Tests (Recommended)
```typescript
describe('teamsStore', () => {
  test('createTeam adds new team', () => {
    // Test team creation
  });
  
  test('updateTeam modifies existing team', () => {
    // Test team updates
  });
  
  test('deleteTeam removes team', () => {
    // Test team deletion
  });
  
  test('importTeams validates JSON', () => {
    // Test import validation
  });
});
```

### Integration Tests (Recommended)
```typescript
describe('Team Filter Integration', () => {
  test('selecting team filters PRs', () => {
    // Test filter integration
  });
  
  test('team checkbox shows indeterminate state', () => {
    // Test UI state
  });
});
```

### E2E Tests (Recommended)
```typescript
describe('Team Management E2E', () => {
  test('user can create and use team', () => {
    // Full user journey
  });
});
```

## Monitoring & Analytics

### Suggested Metrics
- Teams created per user
- Average team size
- Most used teams
- Team edit frequency
- Export/import usage
- Time saved (estimated)

### Event Tracking
```typescript
// Example events to track
'team_created'
'team_updated'
'team_deleted'
'team_selected'
'team_exported'
'team_imported'
```

## Deployment Checklist

- [ ] Code reviewed
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Documentation complete
- [ ] Performance verified
- [ ] Accessibility checked
- [ ] Browser compatibility tested
- [ ] Electron build tested
- [ ] User guide written
- [ ] Analytics events added
- [ ] Error handling verified
- [ ] Edge cases handled

---

**Architecture designed for scalability, maintainability, and performance**