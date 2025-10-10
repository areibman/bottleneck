export interface Team {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  authorLogins: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  login: string;
  avatar_url: string;
  name?: string;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  authorLogins: string[];
}

export interface UpdateTeamData extends Partial<CreateTeamData> {
  id: string;
}

export interface TeamFilter {
  type: 'team';
  teamId: string;
  teamName: string;
  authorLogins: string[];
}

export interface AuthorFilter {
  type: 'author';
  authorLogin: string;
}

export type FilterItem = TeamFilter | AuthorFilter;