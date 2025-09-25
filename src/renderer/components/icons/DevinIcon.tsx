import type { ComponentType } from "react";
import devinIcon from "../../assets/agents/devin.svg";
import { cn } from "../../utils/cn";

interface IconProps {
    className?: string;
}

export const DevinIcon: ComponentType<IconProps> = ({ className }) => {
    // Devin icon doesn't need theme-specific filters
    return (
        <img
            src={devinIcon}
            alt="Devin"
            className={cn("w-4 h-4", className)}
        />
    );
};
