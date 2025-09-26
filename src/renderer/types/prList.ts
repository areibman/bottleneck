import type { PullRequest } from "../services/github";

export type SortByType = "updated" | "created";

export type PRStatusFilter = "open" | "draft" | "merged" | "closed";

export interface PRWithMetadata {
  pr: PullRequest;
  agent: string;
  titlePrefix: string;
  author: string;
  labelNames: string[];
}
