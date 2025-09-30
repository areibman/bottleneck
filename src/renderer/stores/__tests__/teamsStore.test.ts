import { describe, it, expect, beforeEach } from 'vitest';
import { useTeamsStore } from '../teamsStore';
import type { Team, TeamFormData } from '../../types/teams';

describe('TeamsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTeamsStore.setState({
      teams: [],
      selectedTeamIds: new Set(),
    });
  });

  describe('Team CRUD Operations', () => {
    it('should create a new team', () => {
      const store = useTeamsStore.getState();
      const teamData: TeamFormData = {
        name: 'Frontend Team',
        description: 'Frontend developers',
        members: ['john', 'jane', 'bob'],
        color: '#3B82F6',
        icon: '🎨',
      };

      const newTeam = store.createTeam(teamData);

      expect(newTeam).toBeDefined();
      expect(newTeam.name).toBe('Frontend Team');
      expect(newTeam.members).toHaveLength(3);
      expect(newTeam.members[0].login).toBe('john');
      
      const teams = useTeamsStore.getState().teams;
      expect(teams).toContainEqual(expect.objectContaining({
        name: 'Frontend Team',
      }));
    });

    it('should update an existing team', () => {
      const store = useTeamsStore.getState();
      const teamData: TeamFormData = {
        name: 'Backend Team',
        members: ['alice', 'bob'],
      };

      const newTeam = store.createTeam(teamData);
      const teamId = newTeam.id;

      store.updateTeam(teamId, {
        name: 'Updated Backend Team',
        members: ['alice', 'bob', 'charlie'],
      });

      const updatedTeam = store.getTeam(teamId);
      expect(updatedTeam?.name).toBe('Updated Backend Team');
      expect(updatedTeam?.members).toHaveLength(3);
    });

    it('should delete a team', () => {
      const store = useTeamsStore.getState();
      const teamData: TeamFormData = {
        name: 'Test Team',
        members: ['user1'],
      };

      const newTeam = store.createTeam(teamData);
      const teamId = newTeam.id;

      store.deleteTeam(teamId);

      const team = store.getTeam(teamId);
      expect(team).toBeUndefined();
    });

    it('should not delete default teams', () => {
      const store = useTeamsStore.getState();
      const defaultTeam: Team = {
        id: 'default-team',
        name: 'Default Team',
        members: [],
        createdAt: new Date().toISOString(),
        isDefault: true,
      };

      // Add default team
      useTeamsStore.setState({
        teams: [defaultTeam],
      });

      store.deleteTeam('default-team');

      const team = store.getTeam('default-team');
      expect(team).toBeDefined();
      expect(team?.isDefault).toBe(true);
    });
  });

  describe('Team Selection', () => {
    it('should select and deselect teams', () => {
      const store = useTeamsStore.getState();
      const team = store.createTeam({
        name: 'Test Team',
        members: ['user1'],
      });

      store.selectTeam(team.id);
      expect(store.selectedTeamIds.has(team.id)).toBe(true);

      store.deselectTeam(team.id);
      expect(useTeamsStore.getState().selectedTeamIds.has(team.id)).toBe(false);
    });

    it('should toggle team selection', () => {
      const store = useTeamsStore.getState();
      const team = store.createTeam({
        name: 'Test Team',
        members: ['user1'],
      });

      store.toggleTeam(team.id);
      expect(useTeamsStore.getState().selectedTeamIds.has(team.id)).toBe(true);

      store.toggleTeam(team.id);
      expect(useTeamsStore.getState().selectedTeamIds.has(team.id)).toBe(false);
    });

    it('should clear all team selections', () => {
      const store = useTeamsStore.getState();
      const team1 = store.createTeam({
        name: 'Team 1',
        members: ['user1'],
      });
      const team2 = store.createTeam({
        name: 'Team 2',
        members: ['user2'],
      });

      store.selectTeam(team1.id);
      store.selectTeam(team2.id);
      
      store.clearTeamSelection();
      
      const selectedIds = useTeamsStore.getState().selectedTeamIds;
      expect(selectedIds.size).toBe(0);
    });
  });

  describe('Author Management', () => {
    it('should get selected authors from teams', () => {
      const store = useTeamsStore.getState();
      const team1 = store.createTeam({
        name: 'Team 1',
        members: ['alice', 'bob'],
      });
      const team2 = store.createTeam({
        name: 'Team 2',
        members: ['bob', 'charlie'],
      });

      store.selectTeam(team1.id);
      store.selectTeam(team2.id);

      const authors = store.getSelectedAuthors();
      expect(authors).toContain('alice');
      expect(authors).toContain('bob');
      expect(authors).toContain('charlie');
      expect(new Set(authors).size).toBe(3); // Ensure no duplicates
    });

    it('should check if author is in selected teams', () => {
      const store = useTeamsStore.getState();
      const team = store.createTeam({
        name: 'Test Team',
        members: ['alice', 'bob'],
      });

      store.selectTeam(team.id);

      expect(store.isAuthorInSelectedTeams('alice')).toBe(true);
      expect(store.isAuthorInSelectedTeams('bob')).toBe(true);
      expect(store.isAuthorInSelectedTeams('charlie')).toBe(false);
    });
  });

  describe('Import/Export', () => {
    it('should export teams as JSON', () => {
      const store = useTeamsStore.getState();
      store.createTeam({
        name: 'Export Team 1',
        members: ['user1'],
      });
      store.createTeam({
        name: 'Export Team 2',
        members: ['user2'],
      });

      const exported = store.exportTeams();
      const teams = JSON.parse(exported);

      expect(teams).toBeInstanceOf(Array);
      expect(teams).toHaveLength(2);
      expect(teams[0].name).toBe('Export Team 1');
      expect(teams[1].name).toBe('Export Team 2');
    });

    it('should import teams from JSON', () => {
      const store = useTeamsStore.getState();
      const teamsToImport: Team[] = [
        {
          id: 'imported-1',
          name: 'Imported Team 1',
          members: [{ login: 'user1' }],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'imported-2',
          name: 'Imported Team 2',
          members: [{ login: 'user2' }],
          createdAt: new Date().toISOString(),
        },
      ];

      store.importTeams(teamsToImport);

      const team1 = store.getTeam('imported-1');
      const team2 = store.getTeam('imported-2');

      expect(team1).toBeDefined();
      expect(team1?.name).toBe('Imported Team 1');
      expect(team2).toBeDefined();
      expect(team2?.name).toBe('Imported Team 2');
    });

    it('should not import duplicate teams', () => {
      const store = useTeamsStore.getState();
      const team = store.createTeam({
        name: 'Existing Team',
        members: ['user1'],
      });

      const teamsToImport: Team[] = [
        {
          id: team.id, // Same ID as existing team
          name: 'Should Not Import',
          members: [{ login: 'user2' }],
          createdAt: new Date().toISOString(),
        },
      ];

      store.importTeams(teamsToImport);

      const existingTeam = store.getTeam(team.id);
      expect(existingTeam?.name).toBe('Existing Team'); // Should not be overwritten
      expect(existingTeam?.members[0].login).toBe('user1'); // Original members
    });
  });

  describe('Last Used Tracking', () => {
    it('should update last used timestamp when selecting a team', () => {
      const store = useTeamsStore.getState();
      const team = store.createTeam({
        name: 'Test Team',
        members: ['user1'],
      });

      const beforeSelect = store.getTeam(team.id)?.lastUsedAt;
      expect(beforeSelect).toBeUndefined();

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        store.selectTeam(team.id);
        const afterSelect = store.getTeam(team.id)?.lastUsedAt;
        expect(afterSelect).toBeDefined();
      }, 10);
    });
  });
});