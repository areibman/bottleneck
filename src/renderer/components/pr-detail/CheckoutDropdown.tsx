import { useState, useEffect, RefObject } from "react";
import { Check, Copy } from "lucide-react";
import { PullRequest } from "../../services/github";
import { cn } from "../../utils/cn";

interface CheckoutDropdownProps {
  pr: PullRequest;
  theme: "dark" | "light";
  onClose: () => void;
  checkoutDropdownRef: RefObject<HTMLDivElement>;
}

export function CheckoutDropdown({
  pr,
  theme,
  onClose,
  checkoutDropdownRef,
}: CheckoutDropdownProps) {
  const [copiedCommand, setCopiedCommand] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        checkoutDropdownRef.current &&
        !checkoutDropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [checkoutDropdownRef, onClose]);

  const copyCheckoutCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(true);
    setTimeout(() => {
      setCopiedCommand(false);
      onClose();
    }, 2000);
  };

  return (
    <div
      className={cn(
        "absolute right-0 mt-1 w-80 rounded-md shadow-lg z-50",
        theme === "dark"
          ? "bg-gray-800 border border-gray-700"
          : "bg-white border border-gray-200",
      )}
    >
      <div className="p-3 space-y-2">
        <div
          className={cn(
            "text-xs font-semibold mb-2",
            theme === "dark" ? "text-gray-300" : "text-gray-700",
          )}
        >
          Checkout this branch locally:
        </div>

        {/* GitHub CLI command */}
        <div
          className={cn(
            "p-2 rounded font-mono text-xs flex items-center justify-between",
            theme === "dark" ? "bg-gray-900" : "bg-gray-100",
          )}
        >
          <span>gh pr checkout {pr.number}</span>
          <button
            onClick={() => copyCheckoutCommand(`gh pr checkout ${pr.number}`)}
            className={cn(
              "ml-2 p-1 rounded transition-colors",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200",
            )}
          >
            {copiedCommand ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Git commands */}
        <div
          className={cn(
            "text-xs mt-2",
            theme === "dark" ? "text-gray-400" : "text-gray-600",
          )}
        >
          Or using git:
        </div>
        <div
          className={cn(
            "p-2 rounded font-mono text-xs space-y-1",
            theme === "dark" ? "bg-gray-900" : "bg-gray-100",
          )}
        >
          <div>
            git fetch origin pull/{pr.number}/head:{pr.head.ref}
          </div>
          <div>git checkout {pr.head.ref}</div>
        </div>
      </div>
    </div>
  );
}
