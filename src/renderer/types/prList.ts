import type { PullRequest } from "../services/github";

export type SortByType = "updated" | "created";

export interface PRWithMetadata {
  pr: PullRequest;
  agent: string;
  titlePrefix: string;
  author: string;
  labelNames: string[];
}
