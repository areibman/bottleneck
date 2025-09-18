import type { PullRequest } from "../services/github";

export type SortByType = "updated" | "created" | "title";

export type GroupByType = "none" | "agent" | "author" | "label";

export interface PRWithMetadata {
  pr: PullRequest;
  agent: string;
  titlePrefix: string;
  author: string;
  labelNames: string[];
}
