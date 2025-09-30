# Team Management - Code Examples

This document provides code examples for common operations with the team management feature.

## Basic Usage

### 1. Import the Teams Store

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function MyComponent() {
  const { teams, createTeam, updateTeam, deleteTeam } = useTeamsStore();
  
  // Use teams here
}
```

### 2. Create a Team

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function CreateTeamExample() {
  const { createTeam } = useTeamsStore();
  
  const handleCreate = () => {
    createTeam({
      name: "Frontend Team",
      description: "UI/UX developers",
      members: ["alice", "bob", "charlie"],
      color: "#3b82f6",
      icon: "🏢"
    });
  };
  
  return <button onClick={handleCreate}>Create Team</button>;
}
```

### 3. Update a Team

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function UpdateTeamExample({ teamId }) {
  const { updateTeam } = useTeamsStore();
  
  const addMember = () => {
    updateTeam(teamId, {
      members: [...existingMembers, "newMember"]
    });
  };
  
  const changeName = () => {
    updateTeam(teamId, {
      name: "New Team Name"
    });
  };
  
  return (
    <>
      <button onClick={addMember}>Add Member</button>
      <button onClick={changeName}>Change Name</button>
    </>
  );
}
```

### 4. Delete a Team

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function DeleteTeamExample({ teamId }) {
  const { deleteTeam } = useTeamsStore();
  
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this team?")) {
      deleteTeam(teamId);
    }
  };
  
  return <button onClick={handleDelete}>Delete Team</button>;
}
```

### 5. List All Teams

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function TeamList() {
  const { teams } = useTeamsStore();
  
  return (
    <ul>
      {teams.map(team => (
        <li key={team.id}>
          <span style={{ color: team.color }}>●</span>
          {team.name} ({team.members.length} members)
        </li>
      ))}
    </ul>
  );
}
```

### 6. Export Teams

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function ExportTeamsExample() {
  const { exportTeams } = useTeamsStore();
  
  const handleExport = () => {
    const json = exportTeams();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teams.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return <button onClick={handleExport}>Export Teams</button>;
}
```

### 7. Import Teams

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function ImportTeamsExample() {
  const { importTeams } = useTeamsStore();
  const [jsonData, setJsonData] = useState('');
  
  const handleImport = () => {
    const success = importTeams(jsonData);
    if (success) {
      alert('Teams imported successfully!');
      setJsonData('');
    } else {
      alert('Failed to import teams. Check the format.');
    }
  };
  
  return (
    <>
      <textarea
        value={jsonData}
        onChange={(e) => setJsonData(e.target.value)}
        placeholder="Paste JSON here"
      />
      <button onClick={handleImport}>Import</button>
    </>
  );
}
```

## Advanced Usage

### 8. Filter Teams by Member

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function TeamsWithMember({ username }) {
  const { teams } = useTeamsStore();
  
  const userTeams = teams.filter(team => 
    team.members.includes(username)
  );
  
  return (
    <div>
      <h3>Teams for {username}:</h3>
      {userTeams.map(team => (
        <div key={team.id}>{team.name}</div>
      ))}
    </div>
  );
}
```

### 9. Get Team Statistics

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function TeamStatistics() {
  const { teams } = useTeamsStore();
  
  const stats = {
    totalTeams: teams.length,
    totalMembers: teams.reduce((sum, team) => sum + team.members.length, 0),
    avgTeamSize: teams.length > 0 
      ? (teams.reduce((sum, team) => sum + team.members.length, 0) / teams.length).toFixed(1)
      : 0,
    largestTeam: teams.reduce((largest, team) => 
      team.members.length > largest.members.length ? team : largest, 
      teams[0] || { members: [] }
    )
  };
  
  return (
    <div>
      <p>Total Teams: {stats.totalTeams}</p>
      <p>Total Members: {stats.totalMembers}</p>
      <p>Average Team Size: {stats.avgTeamSize}</p>
      <p>Largest Team: {stats.largestTeam.name} ({stats.largestTeam.members.length})</p>
    </div>
  );
}
```

### 10. Recently Used Teams

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function RecentTeams() {
  const { teams } = useTeamsStore();
  
  const recentTeams = teams
    .filter(team => team.lastUsed)
    .sort((a, b) => 
      new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime()
    )
    .slice(0, 5);
  
  return (
    <div>
      <h3>Recently Used Teams:</h3>
      {recentTeams.map(team => (
        <div key={team.id}>
          {team.name} - {new Date(team.lastUsed!).toLocaleString()}
        </div>
      ))}
    </div>
  );
}
```

### 11. Team Color Picker

```typescript
import { useState } from 'react';

function TeamColorPicker({ initialColor, onChange }) {
  const [color, setColor] = useState(initialColor || '#3b82f6');
  
  const presetColors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
  ];
  
  const handleColorChange = (newColor) => {
    setColor(newColor);
    onChange(newColor);
  };
  
  return (
    <div>
      <input
        type="color"
        value={color}
        onChange={(e) => handleColorChange(e.target.value)}
      />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {presetColors.map(preset => (
          <button
            key={preset}
            onClick={() => handleColorChange(preset)}
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: preset,
              border: color === preset ? '2px solid black' : 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 12. Team Member Autocomplete

```typescript
import { useState, useMemo } from 'react';

function TeamMemberSelector({ availableAuthors, selectedMembers, onChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredAuthors = useMemo(() => {
    return availableAuthors.filter(author =>
      author.login.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableAuthors, searchQuery]);
  
  const toggleMember = (login) => {
    const newMembers = selectedMembers.includes(login)
      ? selectedMembers.filter(m => m !== login)
      : [...selectedMembers, login];
    onChange(newMembers);
  };
  
  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search authors..."
      />
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {filteredAuthors.map(author => (
          <label key={author.login} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={selectedMembers.includes(author.login)}
              onChange={() => toggleMember(author.login)}
            />
            <img src={author.avatar_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            {author.login}
          </label>
        ))}
      </div>
      <p>Selected: {selectedMembers.length}</p>
    </div>
  );
}
```

### 13. Bulk Team Operations

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function BulkTeamOperations() {
  const { teams, updateTeam } = useTeamsStore();
  
  const addMemberToAllTeams = (username) => {
    teams.forEach(team => {
      if (!team.members.includes(username)) {
        updateTeam(team.id, {
          members: [...team.members, username]
        });
      }
    });
  };
  
  const removeMemberFromAllTeams = (username) => {
    teams.forEach(team => {
      if (team.members.includes(username)) {
        updateTeam(team.id, {
          members: team.members.filter(m => m !== username)
        });
      }
    });
  };
  
  const updateAllTeamColors = (color) => {
    teams.forEach(team => {
      updateTeam(team.id, { color });
    });
  };
  
  return (
    <div>
      <button onClick={() => addMemberToAllTeams('newuser')}>
        Add 'newuser' to all teams
      </button>
      <button onClick={() => removeMemberFromAllTeams('olduser')}>
        Remove 'olduser' from all teams
      </button>
      <button onClick={() => updateAllTeamColors('#3b82f6')}>
        Set all teams to blue
      </button>
    </div>
  );
}
```

### 14. Team Validation

```typescript
function validateTeam(team) {
  const errors = [];
  
  if (!team.name || team.name.trim().length === 0) {
    errors.push('Team name is required');
  }
  
  if (team.name && team.name.length > 50) {
    errors.push('Team name must be 50 characters or less');
  }
  
  if (!team.members || team.members.length === 0) {
    errors.push('Team must have at least one member');
  }
  
  if (team.members && team.members.length > 100) {
    errors.push('Team cannot have more than 100 members');
  }
  
  if (team.description && team.description.length > 200) {
    errors.push('Description must be 200 characters or less');
  }
  
  if (team.color && !/^#[0-9A-F]{6}$/i.test(team.color)) {
    errors.push('Invalid color format (must be hex code)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Usage
function CreateTeamWithValidation() {
  const { createTeam } = useTeamsStore();
  const [teamData, setTeamData] = useState({ name: '', members: [] });
  
  const handleSubmit = () => {
    const validation = validateTeam(teamData);
    
    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }
    
    createTeam(teamData);
  };
  
  return <button onClick={handleSubmit}>Create Team</button>;
}
```

### 15. Team Comparison

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function TeamComparison({ teamId1, teamId2 }) {
  const { getTeam } = useTeamsStore();
  
  const team1 = getTeam(teamId1);
  const team2 = getTeam(teamId2);
  
  if (!team1 || !team2) return null;
  
  const commonMembers = team1.members.filter(member =>
    team2.members.includes(member)
  );
  
  const uniqueToTeam1 = team1.members.filter(member =>
    !team2.members.includes(member)
  );
  
  const uniqueToTeam2 = team2.members.filter(member =>
    !team1.members.includes(member)
  );
  
  return (
    <div>
      <h3>Comparing {team1.name} vs {team2.name}</h3>
      
      <div>
        <h4>Common Members ({commonMembers.length}):</h4>
        {commonMembers.map(member => <div key={member}>{member}</div>)}
      </div>
      
      <div>
        <h4>Only in {team1.name} ({uniqueToTeam1.length}):</h4>
        {uniqueToTeam1.map(member => <div key={member}>{member}</div>)}
      </div>
      
      <div>
        <h4>Only in {team2.name} ({uniqueToTeam2.length}):</h4>
        {uniqueToTeam2.map(member => <div key={member}>{member}</div>)}
      </div>
    </div>
  );
}
```

## Integration Examples

### 16. Use Team in PR Filter

```typescript
import { useTeamsStore } from '../stores/teamsStore';
import { useUIStore } from '../stores/uiStore';

function FilterByTeam({ teamId }) {
  const { getTeam, markTeamAsUsed } = useTeamsStore();
  const { setPRListFilters } = useUIStore();
  
  const handleFilter = () => {
    const team = getTeam(teamId);
    if (!team) return;
    
    markTeamAsUsed(teamId);
    
    setPRListFilters({
      selectedAuthors: team.members
    });
  };
  
  return <button onClick={handleFilter}>Filter by Team</button>;
}
```

### 17. Show Team Badge

```typescript
import { useTeamsStore } from '../stores/teamsStore';

function TeamBadge({ teamId }) {
  const { getTeam } = useTeamsStore();
  const team = getTeam(teamId);
  
  if (!team) return null;
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '12px',
      backgroundColor: team.color + '20',
      border: `1px solid ${team.color}`,
      fontSize: '12px'
    }}>
      <span style={{ color: team.color }}>●</span>
      <span>{team.name}</span>
      <span style={{ opacity: 0.7 }}>({team.members.length})</span>
    </div>
  );
}
```

### 18. Team Selection Dropdown

```typescript
import { useTeamsStore } from '../stores/teamsStore';
import { useState } from 'react';

function TeamDropdown({ onSelect }) {
  const { teams } = useTeamsStore();
  const [selectedTeamId, setSelectedTeamId] = useState('');
  
  const handleChange = (e) => {
    const teamId = e.target.value;
    setSelectedTeamId(teamId);
    
    const team = teams.find(t => t.id === teamId);
    if (team) {
      onSelect(team);
    }
  };
  
  return (
    <select value={selectedTeamId} onChange={handleChange}>
      <option value="">Select a team...</option>
      {teams.map(team => (
        <option key={team.id} value={team.id}>
          {team.name} ({team.members.length} members)
        </option>
      ))}
    </select>
  );
}
```

### 19. Team Activity Tracker

```typescript
import { useTeamsStore } from '../stores/teamsStore';
import { useMemo } from 'react';

function TeamActivityTracker() {
  const { teams } = useTeamsStore();
  
  const activity = useMemo(() => {
    return teams.map(team => ({
      id: team.id,
      name: team.name,
      memberCount: team.members.length,
      createdAt: new Date(team.createdAt),
      lastUsed: team.lastUsed ? new Date(team.lastUsed) : null,
      daysSinceCreated: Math.floor(
        (Date.now() - new Date(team.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
      daysSinceLastUsed: team.lastUsed
        ? Math.floor(
            (Date.now() - new Date(team.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
          )
        : null
    }));
  }, [teams]);
  
  return (
    <table>
      <thead>
        <tr>
          <th>Team</th>
          <th>Members</th>
          <th>Created</th>
          <th>Last Used</th>
        </tr>
      </thead>
      <tbody>
        {activity.map(item => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.memberCount}</td>
            <td>{item.daysSinceCreated} days ago</td>
            <td>
              {item.daysSinceLastUsed !== null 
                ? `${item.daysSinceLastUsed} days ago`
                : 'Never'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 20. Persistent Team Filter

```typescript
import { useTeamsStore } from '../stores/teamsStore';
import { useEffect } from 'react';

function PersistentTeamFilter() {
  const { teams, markTeamAsUsed } = useTeamsStore();
  const { setPRListFilters } = useUIStore();
  
  // Load last used team on mount
  useEffect(() => {
    const lastTeam = teams
      .filter(t => t.lastUsed)
      .sort((a, b) => 
        new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime()
      )[0];
    
    if (lastTeam) {
      setPRListFilters({
        selectedAuthors: lastTeam.members
      });
    }
  }, []);
  
  return null; // This is a logic-only component
}
```

## Testing Examples

### 21. Test Team Creation

```typescript
import { renderHook, act } from '@testing-library/react';
import { useTeamsStore } from '../stores/teamsStore';

test('creates a team', () => {
  const { result } = renderHook(() => useTeamsStore());
  
  act(() => {
    result.current.createTeam({
      name: 'Test Team',
      members: ['user1', 'user2'],
      color: '#3b82f6'
    });
  });
  
  expect(result.current.teams).toHaveLength(1);
  expect(result.current.teams[0].name).toBe('Test Team');
  expect(result.current.teams[0].members).toEqual(['user1', 'user2']);
});
```

### 22. Test Team Update

```typescript
test('updates a team', () => {
  const { result } = renderHook(() => useTeamsStore());
  
  let teamId;
  act(() => {
    result.current.createTeam({
      name: 'Original Name',
      members: ['user1']
    });
    teamId = result.current.teams[0].id;
  });
  
  act(() => {
    result.current.updateTeam(teamId, {
      name: 'Updated Name',
      members: ['user1', 'user2']
    });
  });
  
  expect(result.current.teams[0].name).toBe('Updated Name');
  expect(result.current.teams[0].members).toHaveLength(2);
});
```

---

These examples demonstrate the full range of capabilities of the team management system. Use them as a reference for building additional features or integrating teams into other parts of your application.