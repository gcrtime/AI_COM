import {
  createSession,
  getListedSessions,
  migratePersistedSessionState,
  SESSION_STORAGE_KEY,
  SESSION_STORAGE_VERSION,
  type PersistedSessionState,
} from "@/lib/agent-events";

export function createBootstrapSessionState(): PersistedSessionState {
  const session = createSession(1);
  return {
    version: SESSION_STORAGE_VERSION,
    activeSessionId: session.id,
    sessions: [session],
  };
}

export function loadSessionStateFromStorage(): PersistedSessionState {
  if (typeof window === "undefined") {
    return createBootstrapSessionState();
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawValue) {
      return createBootstrapSessionState();
    }

    const parsed = JSON.parse(rawValue) as PersistedSessionState;
    if (!Array.isArray(parsed.sessions)) {
      throw new Error("Invalid session state");
    }

    const migrated = migratePersistedSessionState({
      version:
        typeof parsed.version === "number" ? parsed.version : SESSION_STORAGE_VERSION,
      activeSessionId: parsed.activeSessionId,
      sessions: parsed.sessions,
    });

    const listedSessions = getListedSessions(migrated.sessions);
    if (listedSessions.length === 0) {
      const draftSession = createSession(1);
      return {
        version: SESSION_STORAGE_VERSION,
        activeSessionId: draftSession.id,
        sessions: [draftSession],
      };
    }

    const activeSessionId = listedSessions.some(
      (session) => session.id === migrated.activeSessionId,
    )
      ? migrated.activeSessionId
      : listedSessions[0].id;

    return {
      ...migrated,
      activeSessionId,
      sessions: listedSessions,
    };
  } catch {
    return createBootstrapSessionState();
  }
}

/** Yield to the browser before doing heavy localStorage work. */
export function scheduleIdleWork(callback: () => void, timeoutMs = 120): () => void {
  if (typeof window === "undefined") {
    callback();
    return () => {};
  }

  const requestIdle = window.requestIdleCallback?.bind(window);
  if (requestIdle) {
    const id = requestIdle(callback, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }

  const id = globalThis.setTimeout(callback, 0);
  return () => globalThis.clearTimeout(id);
}
