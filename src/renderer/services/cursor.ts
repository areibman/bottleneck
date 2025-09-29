const CURSOR_API_BASE_URL = "https://api.cursor.com";

export class CursorAPIError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, options: { status?: number; data?: unknown } = {}) {
    super(message);
    this.name = "CursorAPIError";
    this.status = options.status;
    this.data = options.data;
  }
}

export interface CursorAgentPromptImage {
  data: string;
  dimension?: {
    width: number;
    height: number;
  };
}

export interface CursorAgentPrompt {
  text: string;
  images?: CursorAgentPromptImage[];
}

export interface CursorAgentSource {
  repository?: string;
  ref?: string;
}

export interface CursorAgentRunInfo {
  status?: string;
  progress?: number;
  started_at?: string;
  completed_at?: string;
}

export interface CursorAgentSummary {
  title?: string;
  description?: string;
}

export interface CursorAgent {
  id: string;
  status?: string;
  model?: string;
  prompt?: CursorAgentPrompt;
  source?: CursorAgentSource;
  created_at?: string;
  updated_at?: string;
  run?: CursorAgentRunInfo;
  summary?: CursorAgentSummary;
  last_error?: {
    message?: string;
  } | null;
  metadata?: Record<string, unknown> | null;
}

export interface CursorAgentConversationMessage {
  role: string;
  content: string;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
}

export interface CursorModel {
  id: string;
  name?: string;
  description?: string;
  context_window?: number;
  max_output_tokens?: number;
  tier?: string;
  capabilities?: string[];
}

export interface CreateCursorAgentRequest {
  prompt: CursorAgentPrompt;
  source?: CursorAgentSource;
  model?: string;
}

export interface CursorAgentFollowUpRequest {
  prompt: CursorAgentPrompt;
}

export class CursorBackgroundAgentAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const method = options.method ?? "GET";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...(options.headers || {}),
    } as Record<string, string>;

    const bodyValue = options.body;
    const bodyString =
      typeof bodyValue === "string"
        ? bodyValue
        : bodyValue
          ? JSON.stringify(bodyValue)
          : null;

    if (typeof window !== "undefined" && window.electron?.cursor?.request) {
      try {
        const result = await window.electron.cursor.request({
          path,
          method,
          headers,
          body: bodyString,
        });

        if (!result.success) {
          throw new CursorAPIError(
            result.error ||
            (result.status ? `Cursor API request failed with status ${result.status}` : "Cursor API request failed"),
            { status: result.status, data: result.data },
          );
        }

        return (result.data as T) ?? (undefined as unknown as T);
      } catch (error) {
        // Only fall back to fetch if the Electron bridge itself failed (not API errors)
        if (error instanceof Error && error.message.includes("No handler registered")) {
          console.warn("Cursor API bridge not available, falling back to window fetch:", error);
        } else {
          // Re-throw API errors (including 409 responses) - don't fall back
          throw error;
        }
      }
    }

    const baseUrl =
      typeof window !== "undefined" && window.location.origin.includes("localhost:3000")
        ? "/cursor-api"
        : CURSOR_API_BASE_URL;

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      method,
      headers,
      body: bodyString ?? undefined,
    });

    if (!response.ok) {
      let errorMessage = `Cursor API request failed with status ${response.status}`;
      let errorData: unknown = null;

      try {
        const errorText = await response.text();
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = errorText;
          }

          if (
            typeof errorData === "object" &&
            errorData !== null &&
            "message" in errorData &&
            typeof (errorData as Record<string, unknown>).message === "string"
          ) {
            errorMessage = (errorData as Record<string, string>).message;
          } else if (typeof errorData === "string" && errorData.trim().length > 0) {
            errorMessage = errorData;
          }
        }
      } catch {
        // Ignore secondary parsing errors and keep defaults
      }

      throw new CursorAPIError(errorMessage, {
        status: response.status,
        data: errorData,
      });
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return (await response.json()) as T;
  }

  async listAgents(): Promise<CursorAgent[]> {
    const result = await this.request<{ agents?: CursorAgent[] } | CursorAgent[]>("/v0/agents", {
      method: "GET",
    });

    if (Array.isArray(result)) {
      return result;
    }

    return result?.agents ?? [];
  }

  getAgent(id: string): Promise<CursorAgent> {
    return this.request<CursorAgent>(`/v0/agents/${id}`, {
      method: "GET",
    });
  }

  getAgentConversation(id: string): Promise<{ messages: CursorAgentConversationMessage[] }> {
    return this.request<{ messages: CursorAgentConversationMessage[] }>(
      `/v0/agents/${id}/conversation`,
      { method: "GET" },
    );
  }

  createAgent(payload: CreateCursorAgentRequest): Promise<CursorAgent> {
    return this.request<CursorAgent>("/v0/agents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  addFollowUp(id: string, payload: CursorAgentFollowUpRequest): Promise<CursorAgent> {
    return this.request<CursorAgent>(`/v0/agents/${id}/followup`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  deleteAgent(id: string): Promise<void> {
    return this.request<void>(`/v0/agents/${id}`, {
      method: "DELETE",
    });
  }

  async listModels(): Promise<CursorModel[]> {
    const result = await this.request<{ models?: CursorModel[] } | CursorModel[]>("/v0/models", {
      method: "GET",
    });

    if (Array.isArray(result)) {
      return result;
    }

    return result?.models ?? [];
  }
}

export const isCursorAPIKeyValid = (apiKey: string | null | undefined): apiKey is string => {
  return Boolean(apiKey && apiKey.trim().startsWith("key_"));
};
