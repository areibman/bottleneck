import { useMemo } from "react";
import { PullRequest, Comment, Review } from "../../services/github";
import { ParticipantStat } from "./types";
import { extractLinks, parseVercelDeployments } from "./utils";

export function useParticipantStats(
  pr: PullRequest,
  comments: Comment[],
  reviews: Review[],
): ParticipantStat[] {
  return useMemo(() => {
    const stats = new Map<string, ParticipantStat>();

    // Add author
    const isAuthorBot =
      pr.user.login.includes("[bot]") || pr.user.login.includes("bot");
    stats.set(pr.user.login, {
      user: pr.user,
      role: "Author",
      comments: 0,
      approvals: 0,
      changesRequested: 0,
      reviewComments: 0,
      isBot: isAuthorBot,
    });

    // Add assignees
    pr.assignees.forEach((assignee) => {
      if (!stats.has(assignee.login)) {
        stats.set(assignee.login, {
          user: assignee,
          role: "Assignee",
          comments: 0,
          approvals: 0,
          changesRequested: 0,
          reviewComments: 0,
        });
      }
    });

    // Add reviewers
    pr.requested_reviewers.forEach((reviewer) => {
      if (!stats.has(reviewer.login)) {
        stats.set(reviewer.login, {
          user: reviewer,
          role: "Reviewer",
          comments: 0,
          approvals: 0,
          changesRequested: 0,
          reviewComments: 0,
        });
      }
    });

    // Count comments and track latest comment
    // Sort comments by date to find the latest one for each user
    const sortedComments = [...comments].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    comments.forEach((comment) => {
      const login = comment.user.login;
      const isBot =
        login.includes("[bot]") ||
        login.includes("bot") ||
        login.includes("vercel");

      if (!stats.has(login)) {
        stats.set(login, {
          user: comment.user,
          role: "Participant",
          comments: 0,
          approvals: 0,
          changesRequested: 0,
          reviewComments: 0,
          isBot,
        });
      }
      const stat = stats.get(login)!;
      stat.comments++;

      // Track the latest comment for this user
      const latestComment = sortedComments.find((c) => c.user.login === login);
      if (latestComment && latestComment.body) {
        stat.latestComment = latestComment.body;

        // Parse Vercel deployments if this is a Vercel bot
        if (login.toLowerCase().includes("vercel")) {
          const deployments = parseVercelDeployments(latestComment.body);
          if (deployments.length > 0) {
            stat.vercelDeployments = deployments;
          }
        }

        // Extract links if it's a bot or has deployment-related keywords
        if (
          isBot ||
          latestComment.body.toLowerCase().includes("deploy") ||
          latestComment.body.toLowerCase().includes("preview") ||
          latestComment.body.includes("vercel.app") ||
          latestComment.body.includes("netlify")
        ) {
          const links = extractLinks(latestComment.body);
          if (links.length > 0) {
            stat.latestCommentLinks = links;
          }
        }
      }
    });

    // Count reviews and track latest review state
    reviews.forEach((review) => {
      const login = review.user.login;
      if (!stats.has(login)) {
        stats.set(login, {
          user: review.user,
          role: "Reviewer",
          comments: 0,
          approvals: 0,
          changesRequested: 0,
          reviewComments: 0,
        });
      }
      const stat = stats.get(login)!;

      // Track specific review types
      if (review.state === "APPROVED") {
        stat.approvals++;
        stat.latestReviewState = "APPROVED";
      } else if (review.state === "CHANGES_REQUESTED") {
        stat.changesRequested++;
        stat.latestReviewState = "CHANGES_REQUESTED";
      } else if (review.state === "COMMENTED") {
        stat.reviewComments++;
        if (!stat.latestReviewState) {
          stat.latestReviewState = "COMMENTED";
        }
      }
    });

    // Add approved/changes requested users from PR data
    pr.approvedBy?.forEach((user) => {
      if (stats.has(user.login)) {
        const stat = stats.get(user.login)!;
        if (stat.approvals === 0) stat.approvals = 1;
        stat.latestReviewState = "APPROVED";
      }
    });

    pr.changesRequestedBy?.forEach((user) => {
      if (stats.has(user.login)) {
        const stat = stats.get(user.login)!;
        if (stat.changesRequested === 0) stat.changesRequested = 1;
        stat.latestReviewState = "CHANGES_REQUESTED";
      }
    });

    return Array.from(stats.values()).sort((a, b) => {
      // Sort by role priority: Author > Reviewer > Assignee > Participant
      const rolePriority: Record<string, number> = {
        Author: 0,
        Reviewer: 1,
        Assignee: 2,
        Participant: 3,
      };
      return rolePriority[a.role] - rolePriority[b.role];
    });
  }, [pr, comments, reviews]);
}
