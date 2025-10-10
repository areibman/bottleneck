export interface Team {
  id: string;
  name: string;
  members: string[]; // Array of author logins
  color?: string; // Optional color for visual identification (e.g., #FF5733)
  icon?: string; // Optional emoji or icon identifier (e.g., "🏢", "👥", "🚀")
  description?: string; // Optional description
  createdAt: string;
  updatedAt: string;
}

export interface TeamState {
  teams: Team[];
  selectedTeams: string[]; // Array of team IDs currently selected for filtering
}

export interface TeamFormData {
  name: string;
  members: string[];
  color?: string;
  icon?: string;
  description?: string;
}