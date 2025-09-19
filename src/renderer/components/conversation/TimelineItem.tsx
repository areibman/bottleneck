import { Check, X, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../../utils/cn";
import { Markdown } from "../Markdown";
import { Review } from "../../services/github";

interface TimelineItemProps {
  item: any; // Using any here to match the original timeline item structure
  theme: "light" | "dark";
}

export function TimelineItem({ item, theme }: TimelineItemProps) {
  const getReviewIcon = (state: string) => {
    switch (state) {
      case "APPROVED":
        return <Check className="w-4 h-4 text-green-400" />;
      case "CHANGES_REQUESTED":
        return <X className="w-4 h-4 text-red-400" />;
      case "COMMENTED":
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  // Skip rendering items that are reviews without body and not meaningful state changes
  const isReview = item.type === "review";
  const review = item as Review;
  const hasContent = item.body && item.body.trim();
  const isMeaningfulReview =
    isReview &&
    (review.state === "APPROVED" ||
      review.state === "CHANGES_REQUESTED" ||
      (review.state === "COMMENTED" && hasContent));

  // Skip empty reviews that aren't approvals or change requests
  if (isReview && !isMeaningfulReview) {
    return null;
  }

  // Also skip non-review items without content
  if (!isReview && !hasContent) {
    return null;
  }

  return (
    <div className="card p-4">
      <div className="flex items-start space-x-3">
        <img
          src={item.user.avatar_url}
          alt={item.user.login}
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {item.type === "review" && getReviewIcon((item as Review).state)}
            <span className="font-semibold">{item.user.login}</span>
            {item.type === "review" && (
              <span className="text-sm">
                {(item as Review).state === "APPROVED" &&
                  "approved these changes"}
                {(item as Review).state === "CHANGES_REQUESTED" &&
                  "requested changes"}
                {(item as Review).state === "COMMENTED" && "reviewed"}
              </span>
            )}
            <span
              className={cn(
                "text-sm",
                theme === "dark" ? "text-gray-500" : "text-gray-600",
              )}
            >
              {formatDistanceToNow(new Date(item.timestamp), {
                addSuffix: true,
              })}
            </span>
          </div>
          {item.body && item.body.trim() && (
            <div
              className={cn(
                theme === "dark" ? "text-gray-300" : "text-gray-700",
              )}
            >
              <Markdown content={item.body} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
