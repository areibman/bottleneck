import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { useSettingsStore } from "../stores/settingsStore";
import { cn } from "../utils/cn";
import {
  CursorAgent,
  CursorBackgroundAgentAPI,
  CursorModel,
  CursorAgentConversationMessage,
  CursorAPIError,
  isCursorAPIKeyValid,
} from "../services/cursor";

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

interface AgentGroup {
  prompt: string;
  agents: CursorAgent[];
}

const CURSOR_API_KEY_STORAGE_KEY = "cursorApiKey";

export default function CursorView() {
  const { theme } = useUIStore();
  const selectedRepo = usePRStore((state) => state.selectedRepo);

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const [models, setModels] = useState<CursorModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [agents, setAgents] = useState<CursorAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [promptText, setPromptText] = useState("");
  const [creatingAgents, setCreatingAgents] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [openFollowUpAgentId, setOpenFollowUpAgentId] = useState<string | null>(null);
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});
  const [followUpSubmitting, setFollowUpSubmitting] = useState<Record<string, boolean>>({});
  const [deletingAgentIds, setDeletingAgentIds] = useState<Record<string, boolean>>({});
  const [conversationState, setConversationState] = useState<
    Record<
      string,
      {
        open: boolean;
        loading: boolean;
        error: string | null;
        messages: CursorAgentConversationMessage[] | null;
      }
    >
  >({});

  const [showExpiredAgents, setShowExpiredAgents] = useState(false);

  const cursorApiKey = useSettingsStore((state) => state.settings.cursorApiKey);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  const apiClient = useMemo(() => {
    if (!activeApiKey) return null;
    return new CursorBackgroundAgentAPI(activeApiKey);
  }, [activeApiKey]);

  const repositoryUrl = useMemo(() => {
    if (!selectedRepo) return null;
    return `https://github.com/${selectedRepo.owner}/${selectedRepo.name}`;
  }, [selectedRepo]);

  const formatTimestamp = useCallback((value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const relative = formatDistanceToNow(date, { addSuffix: true });
    return `${date.toLocaleString()} (${relative})`;
  }, []);

  useEffect(() => {
    if (!cursorApiKey) {
      if (!window.electron) {
        const fallback = localStorage.getItem(CURSOR_API_KEY_STORAGE_KEY) ?? "";
        setApiKeyInput(fallback);
        setActiveApiKey(fallback || null);
        return;
      }

      setApiKeyInput("");
      setActiveApiKey(null);
      return;
    }

    setApiKeyInput(cursorApiKey);
    setActiveApiKey(cursorApiKey || null);
  }, [cursorApiKey]);

  const fetchModels = useCallback(async () => {
    if (!apiClient) return;

    setModelsLoading(true);
    setModelsError(null);

    try {
      const data = await apiClient.listModels();
      setModels(data);
    } catch (error) {
      console.error("Failed to fetch Cursor models:", error);
      setModelsError((error as Error).message || "Failed to load models");
    } finally {
      setModelsLoading(false);
    }
  }, [apiClient]);

  const fetchAgents = useCallback(async () => {
    if (!apiClient) return;

    setAgentsLoading(true);
    setAgentsError(null);

    try {
      const data = await apiClient.listAgents();
      setAgents(data);
      setConversationState((prev) => {
        if (!Object.keys(prev).length) return prev;
        const validIds = new Set(data.map((agent) => agent.id));
        let mutated = false;
        const next: typeof prev = {};

        for (const [id, value] of Object.entries(prev)) {
          if (validIds.has(id)) {
            next[id] = value;
          } else {
            mutated = true;
          }
        }

        return mutated ? next : prev;
      });
    } catch (error) {
      console.error("Failed to fetch Cursor agents:", error);
      setAgentsError((error as Error).message || "Failed to load agents");
    } finally {
      setAgentsLoading(false);
    }
  }, [apiClient]);

  const loadConversation = useCallback(
    async (agentId: string) => {
      if (!apiClient) return;

      try {
        const result = await apiClient.getAgentConversation(agentId);
        setConversationState((prev) => {
          const current = prev[agentId];
          if (!current?.open) {
            return prev;
          }

          return {
            ...prev,
            [agentId]: {
              open: true,
              loading: false,
              error: null,
              messages: result?.messages ?? [],
            },
          };
        });
      } catch (error) {
        const message =
          error instanceof CursorAPIError && error.status === 409
            ? "Cursor no longer retains conversation history for this agent."
            : (error as Error).message || "Failed to load conversation.";

        setConversationState((prev) => {
          const current = prev[agentId];
          if (!current?.open) {
            return prev;
          }

          return {
            ...prev,
            [agentId]: {
              open: true,
              loading: false,
              error: message,
              messages: null,
            },
          };
        });
      }
    },
    [apiClient],
  );

  useEffect(() => {
    if (!apiClient) return;

    void fetchModels();
    void fetchAgents();
  }, [apiClient, fetchAgents, fetchModels]);

  useEffect(() => {
    if (selectedModelIds.length === 0) {
      setSelectedModelIds(["auto"]);
    }
  }, [selectedModelIds.length]);

  const availableModels = useMemo(() => {
    const uniqueModels = models.filter((model) => Boolean(model.id));
    return [
      {
        id: "auto",
        name: "Auto",
        description: "Let Cursor pick the best model for this prompt",
      },
      ...uniqueModels.map((model) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description,
      })),
    ];
  }, [models]);

  const { activeGroups, expiredGroups, expiredCount } = useMemo(() => {
    if (!agents.length) return { activeGroups: [], expiredGroups: [], expiredCount: 0 };

    const activeAgents: CursorAgent[] = [];
    const expiredAgents: CursorAgent[] = [];

    // Separate active and expired agents
    for (const agent of agents) {
      const status = (agent.status || agent.run?.status || "unknown").toLowerCase();
      // Check for various completed/failed states
      const isExpired =
        status === "completed" ||
        status === "complete" ||
        status === "failed" ||
        status === "cancelled" ||
        status === "canceled" ||
        status === "error" ||
        status === "done" ||
        status === "finished" ||
        status === "success";

      if (isExpired) {
        expiredAgents.push(agent);
      } else {
        activeAgents.push(agent);
      }
    }

    const parseTime = (value?: string): number => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const groupAgents = (agentList: CursorAgent[]): AgentGroup[] => {
      const groups = new Map<string, CursorAgent[]>();

      for (const agent of agentList) {
        const promptKey = agent.prompt?.text?.trim() || "(no prompt text)";
        const existing = groups.get(promptKey) ?? [];
        existing.push(agent);
        groups.set(promptKey, existing);
      }

      return Array.from(groups.entries())
        .map(([prompt, agentsForPrompt]) => ({
          prompt,
          agents: agentsForPrompt.sort((a, b) => parseTime(b.created_at) - parseTime(a.created_at)),
        }))
        .sort((a, b) => {
          const latestA = parseTime(a.agents[0]?.created_at);
          const latestB = parseTime(b.agents[0]?.created_at);
          return latestB - latestA;
        });
    };

    return {
      activeGroups: groupAgents(activeAgents),
      expiredGroups: groupAgents(expiredAgents),
      expiredCount: expiredAgents.length,
    };
  }, [agents]);

  const handleSaveApiKey = useCallback(async () => {
    const trimmedKey = apiKeyInput.trim();

    if (!trimmedKey) {
      setApiKeyError("Enter your Cursor API key to continue.");
      return;
    }

    setSavingApiKey(true);
    setApiKeyError(null);

    try {
      if (window.electron?.settings) {
        await window.electron.settings.set(CURSOR_API_KEY_STORAGE_KEY, trimmedKey);
      } else {
        localStorage.setItem(CURSOR_API_KEY_STORAGE_KEY, trimmedKey);
      }

      updateSettings({ cursorApiKey: trimmedKey });
      setActiveApiKey(trimmedKey);
      setFeedback({
        type: "success",
        message: "Cursor API key saved. Manage it anytime from Settings → Advanced.",
      });
    } catch (error) {
      console.error("Failed to save Cursor API key:", error);
      setApiKeyError("Failed to save key. Please try again.");
    } finally {
      setSavingApiKey(false);
    }
  }, [apiKeyInput, updateSettings]);

  const handleRefreshAgents = useCallback(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const handleToggleConversation = useCallback(
    (agentId: string) => {
      if (!apiClient) return;

      let shouldFetch = false;

      setConversationState((prev) => {
        const current = prev[agentId];

        if (current?.open) {
          return {
            ...prev,
            [agentId]: {
              ...current,
              open: false,
            },
          };
        }

        shouldFetch = !current?.messages;

        return {
          ...prev,
          [agentId]: {
            open: true,
            loading: shouldFetch,
            error: null,
            messages: current?.messages ?? null,
          },
        };
      });

      if (shouldFetch) {
        void loadConversation(agentId);
      }
    },
    [apiClient, loadConversation],
  );

  const handleToggleModel = (modelId: string) => {
    setSelectedModelIds((prev) => {
      if (prev.includes(modelId)) {
        const next = prev.filter((id) => id !== modelId);
        return next.length ? next : ["auto"];
      }
      return [...prev.filter((id) => id !== "auto" || modelId === "auto"), modelId];
    });
  };

  const handleCreateAgents = useCallback(async () => {
    if (!apiClient) return;

    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) {
      setFeedback({ type: "error", message: "Prompt cannot be empty." });
      return;
    }

    if (!selectedRepo || !repositoryUrl) {
      setFeedback({ type: "error", message: "Select a repository before creating agents." });
      return;
    }

    const uniqueModels = Array.from(new Set(selectedModelIds));
    if (uniqueModels.length === 0) {
      setFeedback({ type: "error", message: "Select at least one model." });
      return;
    }

    setCreatingAgents(true);
    setFeedback(null);

    try {
      const payloads = uniqueModels.map((modelId) => {
        const payload = {
          prompt: { text: trimmedPrompt },
          source: {
            repository: repositoryUrl,
            ref: selectedRepo.default_branch,
          },
        } as const;

        if (modelId !== "auto") {
          return { ...payload, model: modelId };
        }

        return payload;
      });

      const results = await Promise.allSettled(payloads.map((payload) => apiClient.createAgent(payload)));

      const successes = results.filter((result) => result.status === "fulfilled").length;
      const failures = results.filter((result) => result.status === "rejected");

      if (successes > 0) {
        setFeedback({
          type: "success",
          message: `Successfully started ${successes} background ${successes === 1 ? "agent" : "agents"}.`,
        });
        setPromptText("");
      }

      if (failures.length > 0) {
        const firstError = failures[0] as PromiseRejectedResult;
        setFeedback({
          type: "error",
          message:
            failures.length === payloads.length
              ? (firstError.reason as Error).message || "Failed to create agents."
              : `${failures.length} agent${failures.length === 1 ? "" : "s"} failed: ${(firstError.reason as Error).message}`,
        });
      }

      await fetchAgents();
    } catch (error) {
      console.error("Failed to create background agents:", error);
      setFeedback({ type: "error", message: (error as Error).message || "Failed to create agents." });
    } finally {
      setCreatingAgents(false);
    }
  }, [apiClient, promptText, selectedRepo, repositoryUrl, selectedModelIds, fetchAgents]);

  const handleSendFollowUp = useCallback(
    async (agentId: string) => {
      if (!apiClient) return;

      const draft = followUpDrafts[agentId]?.trim();
      if (!draft) {
        setFeedback({ type: "error", message: "Follow-up prompt cannot be empty." });
        return;
      }

      setFollowUpSubmitting((prev) => ({ ...prev, [agentId]: true }));

      try {
        await apiClient.addFollowUp(agentId, { prompt: { text: draft } });
        setFeedback({ type: "success", message: "Follow-up sent." });
        setFollowUpDrafts((prev) => ({ ...prev, [agentId]: "" }));
        setOpenFollowUpAgentId(null);
        await fetchAgents();

        let shouldReloadConversation = false;
        setConversationState((prev) => {
          const current = prev[agentId];
          if (!current) {
            return prev;
          }

          shouldReloadConversation = current.open;

          return {
            ...prev,
            [agentId]: {
              ...current,
              loading: shouldReloadConversation,
              error: null,
              messages: shouldReloadConversation ? current.messages : null,
            },
          };
        });

        if (shouldReloadConversation) {
          void loadConversation(agentId);
        }
      } catch (error) {
        console.error("Failed to send follow-up:", error);
        const message =
          error instanceof CursorAPIError && error.status === 409
            ? "Cursor reports this agent is no longer accepting follow-ups."
            : (error as Error).message || "Failed to send follow-up.";
        setFeedback({ type: "error", message });
      } finally {
        setFollowUpSubmitting((prev) => ({ ...prev, [agentId]: false }));
      }
    },
    [apiClient, followUpDrafts, fetchAgents, loadConversation],
  );

  const handleDeleteAgent = useCallback(
    async (agentId: string) => {
      if (!apiClient) return;

      setDeletingAgentIds((prev) => ({ ...prev, [agentId]: true }));

      try {
        await apiClient.deleteAgent(agentId);
        setFeedback({ type: "success", message: "Agent deleted." });
        setConversationState((prev) => {
          if (!prev[agentId]) return prev;
          const next = { ...prev };
          delete next[agentId];
          return next;
        });
        await fetchAgents();
      } catch (error) {
        // Only log unexpected errors, not 409 (expected when agent is finalized)
        if (!(error instanceof CursorAPIError && error.status === 409)) {
          console.error("Failed to delete agent:", error);
        }
        const message =
          error instanceof CursorAPIError && error.status === 409
            ? "This agent is already finalized and cannot be deleted."
            : (error as Error).message || "Failed to delete agent.";
        setFeedback({ type: "error", message });
      } finally {
        setDeletingAgentIds((prev) => ({ ...prev, [agentId]: false }));
      }
    },
    [apiClient, fetchAgents],
  );

  const dismissFeedback = () => setFeedback(null);

  return (
    <div
      className={cn(
        "h-full overflow-y-auto",
        theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900",
      )}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 px-6 py-8 pb-16">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold">Cursor Background Agents</h1>
          <p
            className={cn(
              "text-sm leading-relaxed",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            Launch asynchronous Cursor agents for the current repository, monitor progress, send follow-ups, and keep related runs grouped by prompt.
          </p>
        </div>

        {feedback && (
          <div
            className={cn(
              "flex items-center justify-between rounded-md border px-4 py-3 text-sm",
              feedback.type === "success"
                ? theme === "dark"
                  ? "border-emerald-700 bg-emerald-900/40 text-emerald-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                : theme === "dark"
                  ? "border-rose-700 bg-rose-900/40 text-rose-200"
                  : "border-rose-200 bg-rose-50 text-rose-700",
            )}
          >
            <div className="flex items-center gap-3">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={dismissFeedback}
              className={cn(
                "rounded p-1 transition-colors",
                theme === "dark"
                  ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {!activeApiKey && (
          <section
            className={cn(
              "rounded-lg border p-4",
              theme === "dark"
                ? "border-gray-800 bg-gray-900"
                : "border-gray-200 bg-white",
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  theme === "dark" ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600",
                )}
              >
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium">Cursor API Key</h2>
                    <p
                      className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-400" : "text-gray-600",
                      )}
                    >
                      Save your Cursor Background Agents API key to start and manage agents directly from Bottleneck. We’ll store it securely and surface it under Settings → Advanced for future updates.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(event) => setApiKeyInput(event.target.value)}
                    placeholder="key_..."
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-sm",
                      theme === "dark"
                        ? "border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                        : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
                    )}
                  />
                  {apiKeyError && (
                    <p className="text-xs text-rose-500">{apiKeyError}</p>
                  )}
                  {apiKeyInput && !isCursorAPIKeyValid(apiKeyInput) && (
                    <p className={cn("text-xs", theme === "dark" ? "text-yellow-300" : "text-yellow-600")}>
                      API keys typically start with <code>key_</code>. Double-check the value if requests fail.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    disabled={savingApiKey}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      theme === "dark"
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "bg-blue-600 text-white hover:bg-blue-500",
                      savingApiKey && "pointer-events-none opacity-70",
                    )}
                  >
                    {savingApiKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Save API Key
                  </button>
                  <span
                    className={cn(
                      "text-xs",
                      theme === "dark" ? "text-gray-500" : "text-gray-500",
                    )}
                  >
                    Need a key? Grab one from the
                    <a
                      href="https://cursor.com/dashboard?tab=background-agents"
                      target="_blank"
                      rel="noreferrer noopener"
                      className={cn(
                        "ml-1 underline",
                        theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500",
                      )}
                    >
                      Cursor Background Agents dashboard
                    </a>
                    .
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {!activeApiKey ? (
          <div
            className={cn(
              "rounded-lg border p-4 text-sm",
              theme === "dark"
                ? "border-gray-800 bg-gray-900 text-gray-300"
                : "border-gray-200 bg-gray-50 text-gray-700",
            )}
          >
            Save a valid Cursor API key to start managing background agents.
          </div>
        ) : (
          <>
            <section
              className={cn(
                "rounded-lg border p-4",
                theme === "dark"
                  ? "border-gray-800 bg-gray-900"
                  : "border-gray-200 bg-white",
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-medium">Create Background Agents</h2>
                    <p
                      className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-400" : "text-gray-600",
                      )}
                    >
                      We will create one agent per selected model. Agents are scoped to the currently selected repository.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prompt</label>
                    <textarea
                      value={promptText}
                      onChange={(event) => setPromptText(event.target.value)}
                      placeholder="Describe the work you want the agent to complete..."
                      rows={4}
                      className={cn(
                        "w-full resize-none rounded-md border px-3 py-2 text-sm",
                        theme === "dark"
                          ? "border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                          : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
                      )}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-sm font-medium">Models</p>
                    <div className="space-y-2">
                      {modelsLoading ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading models...
                        </div>
                      ) : modelsError ? (
                        <div className="flex items-center gap-2 text-sm text-rose-500">
                          <AlertCircle className="h-4 w-4" /> {modelsError}
                        </div>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {availableModels.map((model) => (
                            <label
                              key={model.id}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors",
                                theme === "dark"
                                  ? selectedModelIds.includes(model.id)
                                    ? "border-blue-600 bg-blue-950/30"
                                    : "border-gray-700 bg-gray-900 hover:border-blue-600/70"
                                  : selectedModelIds.includes(model.id)
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 bg-white hover:border-blue-400/60",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedModelIds.includes(model.id)}
                                onChange={() => handleToggleModel(model.id)}
                                className="mt-0.5 h-4 w-4"
                              />
                              <div className="space-y-1">
                                <p className="font-medium">{model.name}</p>
                                {model.description && (
                                  <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>{model.description}</p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "w-full max-w-sm space-y-3 rounded-md border p-3 text-sm",
                    theme === "dark"
                      ? "border-gray-800 bg-gray-900"
                      : "border-gray-200 bg-gray-50",
                  )}
                >
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">Repository</p>
                    {selectedRepo ? (
                      <div className="rounded border px-3 py-2">
                        <p className="font-medium">{selectedRepo.full_name}</p>
                        <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          Default branch: {selectedRepo.default_branch || "main"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-rose-500">
                        No repository selected. Pick one from the PR tab to enable background agents.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateAgents}
                    disabled={creatingAgents || !selectedRepo || !promptText.trim()}
                    className={cn(
                      "w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      theme === "dark"
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "bg-blue-600 text-white hover:bg-blue-500",
                      (creatingAgents || !selectedRepo || !promptText.trim()) && "pointer-events-none opacity-70",
                    )}
                  >
                    {creatingAgents ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create {selectedModelIds.length > 1 ? `${selectedModelIds.length} Agents` : "Agent"}
                  </button>

                  <div className={cn("border-t pt-2", theme === "dark" ? "border-gray-800" : "border-gray-200")}></div>
                  <p className={cn("text-xs leading-relaxed", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
                    Agents run in isolated cloud workspaces with internet access. Cursor clones your repo and pushes changes on separate branches.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Your Agents</h2>
                <button
                  type="button"
                  onClick={handleRefreshAgents}
                  disabled={agentsLoading}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    theme === "dark"
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-200 text-gray-700 hover:bg-gray-100",
                    agentsLoading && "pointer-events-none opacity-60",
                  )}
                >
                  {agentsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </button>
              </div>

              {agentsError && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-4 py-3 text-sm",
                    theme === "dark"
                      ? "border-rose-700 bg-rose-900/40 text-rose-200"
                      : "border-rose-200 bg-rose-50 text-rose-700",
                  )}
                >
                  <AlertCircle className="h-4 w-4" /> {agentsError}
                </div>
              )}

              {!agentsLoading && activeGroups.length === 0 && expiredCount === 0 && (
                <div
                  className={cn(
                    "rounded-lg border px-6 py-10 text-center text-sm",
                    theme === "dark"
                      ? "border-gray-800 bg-gray-900 text-gray-400"
                      : "border-gray-200 bg-gray-50 text-gray-600",
                  )}
                >
                  No background agents yet. Create one above to get started.
                </div>
              )}

              {agentsLoading && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading agents...
                </div>
              )}

              {/* Active Agents */}
              {activeGroups.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Agents</h3>
                  {activeGroups.map((group) => (
                    <div
                      key={group.prompt}
                      className={cn(
                        "rounded-lg border",
                        theme === "dark" ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white",
                      )}
                    >
                      <div
                        className={cn(
                          "border-b px-4 py-3",
                          theme === "dark" ? "border-gray-800" : "border-gray-200",
                        )}
                      >
                        <p className="text-sm font-medium">Prompt</p>
                        <p className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>{group.prompt}</p>
                      </div>
                      <div className="divide-y">
                        {group.agents.map((agent) => {
                          const status = agent.status || agent.run?.status || "unknown";
                          const createdTitle = agent.created_at
                            ? formatDistanceToNow(new Date(agent.created_at), { addSuffix: true })
                            : "Unknown";
                          const repositoryLabel = agent.source?.repository ?? null;
                          const refLabel = agent.source?.ref ?? null;
                          const runStatusLabel = agent.run?.status ? agent.run.status.replace(/_/g, " ") : null;
                          let runProgress: string | null = null;
                          if (typeof agent.run?.progress === "number") {
                            const normalized = agent.run.progress <= 1 ? agent.run.progress * 100 : agent.run.progress;
                            runProgress = `${Math.round(normalized)}%`;
                          }
                          const startedAt = formatTimestamp(agent.run?.started_at);
                          const completedAt = formatTimestamp(agent.run?.completed_at);
                          const updatedAt = formatTimestamp(agent.updated_at);
                          const metadataItems = [
                            { label: "Repo", value: repositoryLabel },
                            { label: "Ref", value: refLabel },
                            { label: "Run", value: runStatusLabel },
                            { label: "Progress", value: runProgress },
                            { label: "Started", value: startedAt },
                            { label: "Completed", value: completedAt },
                            { label: "Updated", value: updatedAt },
                          ].filter((item) => Boolean(item.value));
                          const isSubmittingFollowUp = Boolean(followUpSubmitting[agent.id]);
                          const isDeleting = Boolean(deletingAgentIds[agent.id]);
                          const conversation = conversationState[agent.id];
                          const isConversationOpen = Boolean(conversation?.open);
                          const isConversationLoading = Boolean(conversation?.loading);
                          const conversationError = conversation?.error;
                          const conversationMessages = conversation?.messages ?? [];

                          return (
                            <div
                              key={agent.id}
                              className={cn(
                                "space-y-3 px-4 py-3 text-sm",
                                theme === "dark" ? "bg-gray-900/40" : "bg-white",
                              )}
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase",
                                        theme === "dark" ? "bg-blue-900/60 text-blue-200" : "bg-blue-100 text-blue-700",
                                      )}
                                    >
                                      {agent.model || "Auto"}
                                    </span>
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
                                        status === "completed"
                                          ? theme === "dark"
                                            ? "bg-emerald-900/60 text-emerald-200"
                                            : "bg-emerald-100 text-emerald-700"
                                          : status === "failed"
                                            ? theme === "dark"
                                              ? "bg-rose-900/60 text-rose-200"
                                              : "bg-rose-100 text-rose-700"
                                            : theme === "dark"
                                              ? "bg-gray-800 text-gray-300"
                                              : "bg-gray-100 text-gray-600",
                                      )}
                                    >
                                      {status.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <div
                                    className={cn(
                                      "text-xs",
                                      theme === "dark" ? "text-gray-400" : "text-gray-600",
                                    )}
                                  >
                                    Created {createdTitle} · Agent ID {agent.id}
                                  </div>
                                  {agent.summary?.title && (
                                    <div className="pt-1">
                                      <p className="text-sm font-medium">{agent.summary.title}</p>
                                      {agent.summary.description && (
                                        <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{agent.summary.description}</p>
                                      )}
                                    </div>
                                  )}
                                  {agent.last_error?.message && (
                                    <p className="text-xs text-rose-500">{agent.last_error.message}</p>
                                  )}
                                  {metadataItems.length > 0 && (
                                    <div
                                      className={cn(
                                        "flex flex-wrap gap-x-5 gap-y-1 text-xs",
                                        theme === "dark" ? "text-gray-400" : "text-gray-600",
                                      )}
                                    >
                                      {metadataItems.map((item) => (
                                        <span key={`${agent.id}-${item.label}`} className="flex items-center gap-1">
                                          <span
                                            className={cn(
                                              "font-semibold",
                                              theme === "dark" ? "text-gray-300" : "text-gray-700",
                                            )}
                                          >
                                            {item.label}:
                                          </span>
                                          <span>{item.value}</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleConversation(agent.id)}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                                      theme === "dark"
                                        ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                                        : "border-gray-200 text-gray-700 hover:bg-gray-100",
                                    )}
                                  >
                                    {isConversationLoading ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <MessageSquare className="h-3.5 w-3.5" />
                                    )}
                                    Conversation
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenFollowUpAgentId((current) => (current === agent.id ? null : agent.id))
                                    }
                                    className={cn(
                                      "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                                      theme === "dark"
                                        ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                                        : "border-gray-200 text-gray-700 hover:bg-gray-100",
                                    )}
                                  >
                                    <MessageSquarePlus className="h-4 w-4" />
                                    Follow-up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteAgent(agent.id)}
                                    disabled={isDeleting}
                                    className={cn(
                                      "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                                      theme === "dark"
                                        ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                                        : "border-gray-200 text-gray-700 hover:bg-gray-100",
                                      isDeleting && "pointer-events-none opacity-60",
                                    )}
                                  >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Delete
                                  </button>
                                </div>
                              </div>

                              {openFollowUpAgentId === agent.id && (
                                <div
                                  className={cn(
                                    "space-y-2.5 rounded-md border p-3",
                                    theme === "dark"
                                      ? "border-gray-800 bg-gray-900"
                                      : "border-gray-200 bg-gray-50",
                                  )}
                                >
                                  <textarea
                                    rows={3}
                                    value={followUpDrafts[agent.id] ?? ""}
                                    onChange={(event) =>
                                      setFollowUpDrafts((prev) => ({ ...prev, [agent.id]: event.target.value }))
                                    }
                                    placeholder="Add more context or nudge the agent..."
                                    className={cn(
                                      "w-full resize-none rounded-md border px-3 py-2 text-sm",
                                      theme === "dark"
                                        ? "border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                                        : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
                                    )}
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setOpenFollowUpAgentId(null)}
                                      className={cn(
                                        "rounded-md px-3 py-2 text-sm",
                                        theme === "dark"
                                          ? "text-gray-300 hover:bg-gray-800"
                                          : "text-gray-600 hover:bg-gray-200",
                                      )}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleSendFollowUp(agent.id)}
                                      disabled={isSubmittingFollowUp}
                                      className={cn(
                                        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                        theme === "dark"
                                          ? "bg-blue-600 text-white hover:bg-blue-500"
                                          : "bg-blue-600 text-white hover:bg-blue-500",
                                        isSubmittingFollowUp && "pointer-events-none opacity-70",
                                      )}
                                    >
                                      {isSubmittingFollowUp ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Send className="h-4 w-4" />
                                      )}
                                      Send Follow-up
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isConversationOpen && (
                                <div
                                  className={cn(
                                    "space-y-2 rounded-md border p-3",
                                    theme === "dark"
                                      ? "border-gray-800 bg-gray-900"
                                      : "border-gray-200 bg-gray-50",
                                  )}
                                >
                                  {isConversationLoading ? (
                                    <div className="flex items-center gap-2 text-xs">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading conversation...
                                    </div>
                                  ) : conversationError ? (
                                    <p className="text-xs text-rose-500">{conversationError}</p>
                                  ) : conversationMessages.length === 0 ? (
                                    <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600")}>No conversation history yet.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {conversationMessages.map((message, index) => {
                                        const createdAtText = message.created_at
                                          ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
                                          : null;

                                        return (
                                          <div
                                            key={`${agent.id}-msg-${index}`}
                                            className={cn(
                                              "rounded-md border px-3 py-2",
                                              theme === "dark"
                                                ? "border-gray-800 bg-gray-950/60"
                                                : "border-gray-200 bg-white",
                                            )}
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide">
                                              <span
                                                className={cn(
                                                  "font-semibold",
                                                  message.role === "assistant"
                                                    ? theme === "dark"
                                                      ? "text-blue-300"
                                                      : "text-blue-600"
                                                    : message.role === "user"
                                                      ? theme === "dark"
                                                        ? "text-emerald-300"
                                                        : "text-emerald-600"
                                                      : theme === "dark"
                                                        ? "text-gray-400"
                                                        : "text-gray-600",
                                                )}
                                              >
                                                {message.role}
                                              </span>
                                              {createdAtText && (
                                                <span className={cn("text-[10px] lowercase", theme === "dark" ? "text-gray-500" : "text-gray-500")}>{createdAtText}</span>
                                              )}
                                            </div>
                                            <div
                                              className={cn(
                                                "mt-1 whitespace-pre-wrap text-sm leading-relaxed",
                                                theme === "dark" ? "text-gray-200" : "text-gray-700",
                                              )}
                                            >
                                              {message.content}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expired/Completed Agents - Collapsible */}
              {expiredCount > 0 && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowExpiredAgents(!showExpiredAgents)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                      theme === "dark"
                        ? "border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    <span>Completed/Failed Agents ({expiredCount})</span>
                    {showExpiredAgents ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showExpiredAgents && (
                    <div className="space-y-4">
                      {expiredGroups.map((group) => (
                        <div
                          key={group.prompt}
                          className={cn(
                            "rounded-lg border opacity-75",
                            theme === "dark" ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white",
                          )}
                        >
                          <div
                            className={cn(
                              "border-b px-4 py-3",
                              theme === "dark" ? "border-gray-800" : "border-gray-200",
                            )}
                          >
                            <p className="text-sm font-medium">Prompt</p>
                            <p className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>{group.prompt}</p>
                          </div>
                          <div className="divide-y">
                            {group.agents.map((agent) => {
                              const status = agent.status || agent.run?.status || "unknown";
                              const createdTitle = agent.created_at
                                ? formatDistanceToNow(new Date(agent.created_at), { addSuffix: true })
                                : "Unknown";
                              const repositoryLabel = agent.source?.repository ?? null;
                              const refLabel = agent.source?.ref ?? null;
                              const runStatusLabel = agent.run?.status ? agent.run.status.replace(/_/g, " ") : null;
                              let runProgress: string | null = null;
                              if (typeof agent.run?.progress === "number") {
                                const normalized = agent.run.progress <= 1 ? agent.run.progress * 100 : agent.run.progress;
                                runProgress = `${Math.round(normalized)}%`;
                              }
                              const startedAt = formatTimestamp(agent.run?.started_at);
                              const completedAt = formatTimestamp(agent.run?.completed_at);
                              const updatedAt = formatTimestamp(agent.updated_at);
                              const metadataItems = [
                                { label: "Repo", value: repositoryLabel },
                                { label: "Ref", value: refLabel },
                                { label: "Run", value: runStatusLabel },
                                { label: "Progress", value: runProgress },
                                { label: "Started", value: startedAt },
                                { label: "Completed", value: completedAt },
                                { label: "Updated", value: updatedAt },
                              ].filter((item) => Boolean(item.value));
                              const isSubmittingFollowUp = Boolean(followUpSubmitting[agent.id]);
                              const isDeleting = Boolean(deletingAgentIds[agent.id]);
                              const conversation = conversationState[agent.id];
                              const isConversationOpen = Boolean(conversation?.open);
                              const isConversationLoading = Boolean(conversation?.loading);
                              const conversationError = conversation?.error;
                              const conversationMessages = conversation?.messages ?? [];

                              return (
                                <div
                                  key={agent.id}
                                  className={cn(
                                    "space-y-3 px-4 py-3 text-sm",
                                    theme === "dark" ? "bg-gray-900/40" : "bg-white",
                                  )}
                                >
                                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase",
                                            theme === "dark" ? "bg-blue-900/60 text-blue-200" : "bg-blue-100 text-blue-700",
                                          )}
                                        >
                                          {agent.model || "Auto"}
                                        </span>
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
                                            status === "completed"
                                              ? theme === "dark"
                                                ? "bg-emerald-900/60 text-emerald-200"
                                                : "bg-emerald-100 text-emerald-700"
                                              : status === "failed"
                                                ? theme === "dark"
                                                  ? "bg-rose-900/60 text-rose-200"
                                                  : "bg-rose-100 text-rose-700"
                                                : theme === "dark"
                                                  ? "bg-gray-800 text-gray-300"
                                                  : "bg-gray-100 text-gray-600",
                                          )}
                                        >
                                          {status.replace(/_/g, " ")}
                                        </span>
                                      </div>
                                      <div
                                        className={cn(
                                          "text-xs",
                                          theme === "dark" ? "text-gray-400" : "text-gray-600",
                                        )}
                                      >
                                        Created {createdTitle} · Agent ID {agent.id}
                                      </div>
                                      {agent.summary?.title && (
                                        <div className="pt-1">
                                          <p className="text-sm font-medium">{agent.summary.title}</p>
                                          {agent.summary.description && (
                                            <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{agent.summary.description}</p>
                                          )}
                                        </div>
                                      )}
                                      {agent.last_error?.message && (
                                        <p className="text-xs text-rose-500">{agent.last_error.message}</p>
                                      )}
                                      {metadataItems.length > 0 && (
                                        <div
                                          className={cn(
                                            "flex flex-wrap gap-x-5 gap-y-1 text-xs",
                                            theme === "dark" ? "text-gray-400" : "text-gray-600",
                                          )}
                                        >
                                          {metadataItems.map((item) => (
                                            <span key={`${agent.id}-${item.label}`} className="flex items-center gap-1">
                                              <span
                                                className={cn(
                                                  "font-semibold",
                                                  theme === "dark" ? "text-gray-300" : "text-gray-700",
                                                )}
                                              >
                                                {item.label}:
                                              </span>
                                              <span>{item.value}</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleConversation(agent.id)}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                                          theme === "dark"
                                            ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                                            : "border-gray-200 text-gray-700 hover:bg-gray-100",
                                        )}
                                      >
                                        {isConversationLoading ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <MessageSquare className="h-3.5 w-3.5" />
                                        )}
                                        Conversation
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenFollowUpAgentId((current) => (current === agent.id ? null : agent.id))
                                        }
                                        className={cn(
                                          "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                                          theme === "dark"
                                            ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                                            : "border-gray-200 text-gray-700 hover:bg-gray-100",
                                        )}
                                      >
                                        <MessageSquarePlus className="h-4 w-4" />
                                        Follow-up
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteAgent(agent.id)}
                                        disabled={isDeleting}
                                        className={cn(
                                          "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                                          theme === "dark"
                                            ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                                            : "border-gray-200 text-gray-700 hover:bg-gray-100",
                                          isDeleting && "pointer-events-none opacity-60",
                                        )}
                                      >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        Delete
                                      </button>
                                    </div>
                                  </div>

                                  {openFollowUpAgentId === agent.id && (
                                    <div
                                      className={cn(
                                        "space-y-2.5 rounded-md border p-3",
                                        theme === "dark"
                                          ? "border-gray-800 bg-gray-900"
                                          : "border-gray-200 bg-gray-50",
                                      )}
                                    >
                                      <textarea
                                        rows={3}
                                        value={followUpDrafts[agent.id] ?? ""}
                                        onChange={(event) =>
                                          setFollowUpDrafts((prev) => ({ ...prev, [agent.id]: event.target.value }))
                                        }
                                        placeholder="Add more context or nudge the agent..."
                                        className={cn(
                                          "w-full resize-none rounded-md border px-3 py-2 text-sm",
                                          theme === "dark"
                                            ? "border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                                            : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
                                        )}
                                      />
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setOpenFollowUpAgentId(null)}
                                          className={cn(
                                            "rounded-md px-3 py-2 text-sm",
                                            theme === "dark"
                                              ? "text-gray-300 hover:bg-gray-800"
                                              : "text-gray-600 hover:bg-gray-200",
                                          )}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleSendFollowUp(agent.id)}
                                          disabled={isSubmittingFollowUp}
                                          className={cn(
                                            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                            theme === "dark"
                                              ? "bg-blue-600 text-white hover:bg-blue-500"
                                              : "bg-blue-600 text-white hover:bg-blue-500",
                                            isSubmittingFollowUp && "pointer-events-none opacity-70",
                                          )}
                                        >
                                          {isSubmittingFollowUp ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Send className="h-4 w-4" />
                                          )}
                                          Send Follow-up
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {isConversationOpen && (
                                    <div
                                      className={cn(
                                        "space-y-2 rounded-md border p-3",
                                        theme === "dark"
                                          ? "border-gray-800 bg-gray-900"
                                          : "border-gray-200 bg-gray-50",
                                      )}
                                    >
                                      {isConversationLoading ? (
                                        <div className="flex items-center gap-2 text-xs">
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading conversation...
                                        </div>
                                      ) : conversationError ? (
                                        <p className="text-xs text-rose-500">{conversationError}</p>
                                      ) : conversationMessages.length === 0 ? (
                                        <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600")}>No conversation history yet.</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {conversationMessages.map((message, index) => {
                                            const createdAtText = message.created_at
                                              ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
                                              : null;

                                            return (
                                              <div
                                                key={`${agent.id}-msg-${index}`}
                                                className={cn(
                                                  "rounded-md border px-3 py-2",
                                                  theme === "dark"
                                                    ? "border-gray-800 bg-gray-950/60"
                                                    : "border-gray-200 bg-white",
                                                )}
                                              >
                                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide">
                                                  <span
                                                    className={cn(
                                                      "font-semibold",
                                                      message.role === "assistant"
                                                        ? theme === "dark"
                                                          ? "text-blue-300"
                                                          : "text-blue-600"
                                                        : message.role === "user"
                                                          ? theme === "dark"
                                                            ? "text-emerald-300"
                                                            : "text-emerald-600"
                                                          : theme === "dark"
                                                            ? "text-gray-400"
                                                            : "text-gray-600",
                                                    )}
                                                  >
                                                    {message.role}
                                                  </span>
                                                  {createdAtText && (
                                                    <span className={cn("text-[10px] lowercase", theme === "dark" ? "text-gray-500" : "text-gray-500")}>{createdAtText}</span>
                                                  )}
                                                </div>
                                                <div
                                                  className={cn(
                                                    "mt-1 whitespace-pre-wrap text-sm leading-relaxed",
                                                    theme === "dark" ? "text-gray-200" : "text-gray-700",
                                                  )}
                                                >
                                                  {message.content}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
