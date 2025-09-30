/**
 * Team-related type definitions
 */

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  color?: string;
  icon?: string;
  createdAt: string;
  lastUsedAt?: string;
  isDefault?: boolean; // For system-defined teams
}

export interface TeamMember {
  login: string;
  avatarUrl?: string;
  name?: string;
}

export interface TeamsState {
  teams: Team[];
  selectedTeams: string[]; // Team IDs currently selected for filtering
}

export interface TeamFilterOption {
  type: 'team' | 'author' | 'separator' | 'action';
  value: string;
  label: string;
  icon?: React.ReactNode;
  memberCount?: number;
  members?: TeamMember[];
  color?: string;
}

export type TeamAction = 'create' | 'edit' | 'delete' | 'import' | 'export';

export interface TeamFormData {
  name: string;
  description?: string;
  members: string[]; // Array of user logins
  color?: string;
  icon?: string;
}