import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";

interface PRTagProps {
    prNumber: number;
    state: "open" | "closed" | "merged";
    isDraft?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
}

export function PRTag({ prNumber, state, isDraft, onClick, className }: PRTagProps) {
    const getVariantStyles = () => {
        if (state === "merged") {
            return "bg-purple-500 text-white hover:bg-purple-800";
        }
        if (state === "open") {
            if (isDraft) {
                return "bg-blue-500 text-white hover:bg-gray-800";
            }
            return "bg-green-900 text-green-300 hover:bg-green-800";
        }
        // closed
        return "bg-red-900 text-red-300 hover:bg-red-800";
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "text-[9px] px-1 py-0.5 rounded flex-shrink-0 transition-colors cursor-pointer font-medium",
                getVariantStyles(),
                className
            )}
            title={`View PR #${prNumber}`}
        >
            PR #{prNumber}
        </div>
    );
}
