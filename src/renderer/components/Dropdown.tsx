import React from "react";
import { ChevronDown } from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

export interface DropdownOption<T extends string = string> {
    value: T;
    label: string;
    icon?: React.ReactNode;
}

interface DropdownProps<T extends string> {
    options: DropdownOption<T>[];
    value: T;
    onChange: (value: T) => void;
    buttonClassName?: string;
    menuClassName?: string;
    labelPrefix?: string;
    width?: string;
    useLabelPrefixAsDisplay?: boolean;
}

export default function Dropdown<T extends string>({
    options,
    value,
    onChange,
    buttonClassName,
    menuClassName,
    labelPrefix,
    width,
    useLabelPrefixAsDisplay,
}: DropdownProps<T>) {
    const { theme } = useUIStore();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const selectedOption = options.find((option) => option.value === value);

    const handleSelect = (optionValue: T) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className={cn("relative", width || "w-full min-w-[160px] max-w-md")} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between text-xs px-3 py-1.5 rounded-md transition-colors border w-full",
                    theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        : "bg-white border-gray-300 text-gray-900 hover:bg-gray-100",
                    buttonClassName,
                )}
            >
                <span className="flex items-center min-w-0">
                    {selectedOption?.icon && <span className="mr-2 flex-shrink-0">{selectedOption.icon}</span>}
                    <span className="truncate">
                        {useLabelPrefixAsDisplay
                            ? (labelPrefix || "")
                            : (selectedOption ? selectedOption.label : (labelPrefix || ""))
                        }
                    </span>
                </span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
            </button>

            {isOpen && (
                <div
                    className={cn(
                        "absolute left-0 mt-1 w-full rounded-md shadow-lg z-20 overflow-hidden border",
                        theme === "dark"
                            ? "bg-gray-800 border-gray-700"
                            : "bg-white border-gray-200",
                        menuClassName,
                    )}
                >
                    <div className="px-1 py-0">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "w-full text-left px-3 py-1.5 my-1 text-xs rounded flex items-center cursor-pointer min-w-0",
                                    theme === "dark"
                                        ? "hover:bg-gray-700"
                                        : "hover:bg-gray-100",
                                    value === option.value &&
                                    (theme === "dark" ? "bg-gray-700" : "bg-gray-100"),
                                )}
                            >
                                {option.icon && <span className="mr-2 flex-shrink-0">{option.icon}</span>}
                                <span className="truncate">{option.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
