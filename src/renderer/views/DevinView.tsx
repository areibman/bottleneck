import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

export default function DevinView() {
  const { theme } = useUIStore();

  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center px-8 text-center",
        theme === "dark" ? "bg-gray-900" : "bg-white",
      )}
    >
      <div className="max-w-md space-y-4">
        <h1
          className={cn(
            "text-3xl font-semibold",
            theme === "dark" ? "text-gray-100" : "text-gray-900",
          )}
        >
          Devin Agent
        </h1>
        <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}
        >
          TODO: Integrate Devin to automate complex coding tasks and reviews directly inside Bottleneck.
        </p>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
            theme === "dark"
              ? "bg-gray-800 text-gray-300"
              : "bg-gray-100 text-gray-700",
          )}
        >
          <span className="rounded-sm bg-blue-500 px-2 py-1 text-[0.65rem] uppercase tracking-wide text-white">
            Todo
          </span>
          <span>Implementation in progress</span>
        </div>
      </div>
    </div>
  );
}
