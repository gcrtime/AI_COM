import { ABORTED } from "@/lib/utils";

export type ToolInvocationVisualState =
  | "pending"
  | "complete"
  | "error"
  | "aborted";

export function isToolResultError(result: unknown): boolean {
  if (result === ABORTED || result === null || result === undefined) {
    return false;
  }

  if (typeof result === "string") {
    return (
      result.startsWith("Error executing tool") ||
      result.startsWith("Error executing command:")
    );
  }

  if (typeof result === "object") {
    const record = result as Record<string, unknown>;

    if (record.isError === true) {
      return true;
    }

    if (record.type === "error") {
      return true;
    }

    if (typeof record.error === "string" && record.error.length > 0) {
      return true;
    }

    if (
      record.type === "text" &&
      typeof record.text === "string" &&
      (record.text.startsWith("Error executing tool") ||
        record.text.startsWith("Error executing command:"))
    ) {
      return true;
    }
  }

  return false;
}

export function resolveToolInvocationVisualState(
  state: "partial-call" | "call" | "result",
  result: unknown,
): ToolInvocationVisualState {
  if (state === "partial-call" || state === "call") {
    return "pending";
  }

  if (result === ABORTED) {
    return "aborted";
  }

  if (isToolResultError(result)) {
    return "error";
  }

  return "complete";
}

export function getToolErrorMessage(result: unknown): string | null {
  if (!isToolResultError(result)) {
    return null;
  }

  if (typeof result === "string") {
    return result;
  }

  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;

    if (typeof record.error === "string") {
      return record.error;
    }

    if (
      record.type === "text" &&
      typeof record.text === "string" &&
      isToolResultError(record.text)
    ) {
      return record.text;
    }
  }

  return "Tool execution failed";
}

export function mapVisualStateToEventStatus(
  visualState: ToolInvocationVisualState,
): "pending" | "complete" | "error" {
  switch (visualState) {
    case "pending":
      return "pending";
    case "error":
      return "error";
    case "aborted":
    case "complete":
    default:
      return "complete";
  }
}
