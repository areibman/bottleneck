export interface VercelDeployment {
  project: string;
  status: "Ready" | "Ignored" | "Building" | "Error" | "Canceled";
  preview?: string;
  comments?: string;
  updated: string;
}

export interface ParticipantStat {
  user: { login: string; avatar_url: string };
  role: string;
  comments: number;
  approvals: number;
  changesRequested: number;
  reviewComments: number;
  latestReviewState?: string;
  latestComment?: string;
  latestCommentLinks?: { text: string; url: string }[];
  vercelDeployments?: VercelDeployment[];
  isBot?: boolean;
}

export interface TimelineItem {
  id: string | number;
  type: "comment" | "review";
  timestamp: string;
  user: { login: string; avatar_url: string };
  body?: string;
  state?: string;
}
