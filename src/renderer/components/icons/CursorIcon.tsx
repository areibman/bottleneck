import type { ComponentType } from "react";
import cursorIcon from "../../assets/agents/cursor.svg";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";

interface IconProps {
    className?: string;
}

export const CursorIcon: ComponentType<IconProps> = ({ className }) => {
    const { theme } = useUIStore();
    // Cursor icon needs to be inverted in light theme
    const filter = theme === "light" ? "invert(1)" : undefined;

    return (
        <img
            src={cursorIcon}
            alt="Cursor"
            className={cn("w-4 h-4", className)}
            style={filter ? { filter } : undefined}
        />
    );
};
