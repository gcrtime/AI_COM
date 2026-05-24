import type { UIMessage } from "ai";

import type { AgentEvent } from "@/lib/agent-events";

export type ChatRuntimeStatus = "submitted" | "streaming" | "ready" | "error";

export type DebugAgentStatus =
  | "idle"
  | "streaming"
  | "tool running"
  | "desktop booting"
  | "completed"
  | "error";

export type ProductAgentStatus =
  | "Idle"
  | "Thinking"
  | "Using tools"
  | "Ready"
  | "Error";

export function deriveDebugAgentStatus({
  chatStatus,
  desktopError,
  desktopInitializing,
  events,
  messages,
}: {
  chatStatus: ChatRuntimeStatus;
  desktopError: string | null;
  desktopInitializing: boolean;
  events: AgentEvent[];
  messages: UIMessage[];
}): DebugAgentStatus {
  if (desktopError || chatStatus === "error") {
    return "error";
  }

  if (desktopInitializing) {
    return "desktop booting";
  }

  const hasRunningTool = events.some((event) => event.status === "pending");
  if (hasRunningTool) {
    return "tool running";
  }

  if (chatStatus === "submitted" || chatStatus === "streaming") {
    return "streaming";
  }

  const hasCompletedWork =
    events.length > 0 || messages.some((message) => message.role === "assistant");

  if (hasCompletedWork) {
    return "completed";
  }

  return "idle";
}

export function deriveProductAgentStatus(
  debugStatus: DebugAgentStatus,
): ProductAgentStatus {
  switch (debugStatus) {
    case "error":
      return "Error";
    case "tool running":
      return "Using tools";
    case "desktop booting":
    case "streaming":
      return "Thinking";
    case "completed":
      return "Ready";
    case "idle":
    default:
      return "Idle";
  }
}
