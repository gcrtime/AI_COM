import type { ChatSession } from "@/lib/agent-events";

export const SHARED_SANDBOX_STORAGE_KEY = "ai-sdk-dashboard-shared-sandbox-id";

export function readSharedSandboxId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(SHARED_SANDBOX_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeSharedSandboxId(sandboxId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(SHARED_SANDBOX_STORAGE_KEY, sandboxId);
  } catch {
    // ignore quota / private mode
  }
}

export function clearSharedSandboxId() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(SHARED_SANDBOX_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Prefer sessionStorage, then any session that already has a sandbox id. */
export function pickReconnectSandboxId(sessions: ChatSession[]): string | undefined {
  const stored = readSharedSandboxId();
  if (stored) {
    return stored;
  }

  return sessions.find((session) => session.sandboxId)?.sandboxId ?? undefined;
}
