import type { ComponentType } from "react";
import openaiIcon from "../../assets/agents/openai.svg";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";

interface IconProps {
    className?: string;
}

export const ChatGPTIcon: ComponentType<IconProps> = ({ className }) => {
    const { theme } = useUIStore();
    // OpenAI icon needs to be inverted in dark theme
    const filter = theme === "dark" ? "invert(1)" : undefined;

    return (
        <img
            src={openaiIcon}
            alt="ChatGPT"
            className={cn("w-4 h-4", className)}
            style={filter ? { filter } : undefined}
        />
    );
};
