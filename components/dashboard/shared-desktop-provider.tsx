"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { ChatPanel } from "@/components/dashboard/chat-panel";
import { toast } from "sonner";

import {
  createDesktopLifecycleEvent,
  type AgentEvent,
  type ChatSession,
} from "@/lib/agent-events";
import { SANDBOX_UI_DISABLED } from "@/lib/feature-flags";
import { getDesktopURL, killDesktop } from "@/lib/sandbox/utils";
import { scheduleIdleWork } from "@/lib/session-storage";

export type SharedDesktopStream = {
  error: string | null;
  isInitializing: boolean;
  streamUrl: string | null;
};

const IDLE_STREAM: SharedDesktopStream = {
  error: null,
  isInitializing: false,
  streamUrl: null,
};

const DESKTOP_HEALTH_CHECK_INTERVAL_MS = 15_000;

const SharedSandboxIdContext = createContext<string | null>(null);
const SharedDesktopStreamContext =
  createContext<SharedDesktopStream>(IDLE_STREAM);
const EnsureDesktopContext = createContext<(forceNew?: boolean) => void>(
  () => {},
);

export function useSharedSandboxId() {
  return useContext(SharedSandboxIdContext);
}

export function useSharedDesktopStream() {
  return useContext(SharedDesktopStreamContext);
}

export function useEnsureDesktop() {
  return useContext(EnsureDesktopContext);
}

export function ConnectedChatPanel(
  props: Omit<ComponentProps<typeof ChatPanel>, "sandboxId">,
) {
  const sandboxId = useSharedSandboxId();
  return <ChatPanel {...props} sandboxId={sandboxId} />;
}

type SharedDesktopProviderProps = {
  activeSession: ChatSession;
  children: ReactNode;
  isSessionHydrated: boolean;
  onDesktopEvent: (sessionId: string, event: AgentEvent) => void;
  sessions: ChatSession[];
  onSandboxIdReady: (sessionId: string, sandboxId: string) => void;
};

export function SharedDesktopProvider({
  activeSession,
  children,
  isSessionHydrated,
  onDesktopEvent,
  sessions,
  onSandboxIdReady,
}: SharedDesktopProviderProps) {
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [stream, setStream] = useState<SharedDesktopStream>(IDLE_STREAM);
  const inFlightRef = useRef(false);
  const repairInFlightRef = useRef(false);
  const activeSessionRef = useRef(activeSession);
  const currentSessionIdRef = useRef<string | null>(null);
  const sandboxIdRef = useRef<string | null>(null);
  const streamCacheRef = useRef(
    new Map<string, { sandboxId: string; streamUrl: string }>(),
  );
  const streamRef = useRef(stream);
  activeSessionRef.current = activeSession;
  streamRef.current = stream;
  sandboxIdRef.current = sandboxId;

  const ensureDesktop = useCallback(
    async (forceNew = false) => {
      if (SANDBOX_UI_DISABLED || inFlightRef.current) {
        return;
      }

      const session = activeSessionRef.current;
      const cachedStream = streamCacheRef.current.get(session.id);
      const hasLiveStream =
        !forceNew &&
        currentSessionIdRef.current === session.id &&
        sandboxIdRef.current === session.sandboxId &&
        streamRef.current.streamUrl &&
        !streamRef.current.error;

      if (hasLiveStream) {
        return;
      }

      if (
        !forceNew &&
        session.sandboxId &&
        cachedStream?.sandboxId === session.sandboxId
      ) {
        onDesktopEvent(
          session.id,
          createDesktopLifecycleEvent({
            sandboxId: session.sandboxId,
            sessionId: session.id,
            type: "desktop_connect",
          }),
        );
        currentSessionIdRef.current = session.id;
        startTransition(() => {
          setSandboxId(session.sandboxId);
          setStream({
            error: null,
            isInitializing: false,
            streamUrl: cachedStream.streamUrl,
          });
        });
        return;
      }

      inFlightRef.current = true;

      startTransition(() => {
        setSandboxId((current) =>
          currentSessionIdRef.current === session.id ? current : null,
        );
        setStream({
          error: null,
          isInitializing: true,
          streamUrl:
            !forceNew && currentSessionIdRef.current === session.id
              ? streamRef.current.streamUrl
              : null,
        });
      });

      try {
        if (forceNew && session.sandboxId) {
          await killDesktop(session.sandboxId);
          streamCacheRef.current.delete(session.id);
        }

        const reconnectId = forceNew ? undefined : (session.sandboxId ?? undefined);

        const { id, streamUrl } = await getDesktopURL(reconnectId);

        onDesktopEvent(
          session.id,
          createDesktopLifecycleEvent({
            previousSandboxId: forceNew ? session.sandboxId ?? undefined : undefined,
            sandboxId: id,
            sessionId: session.id,
            type: forceNew
              ? "desktop_reset"
              : session.sandboxId
                ? "desktop_connect"
                : "desktop_boot",
          }),
        );

        streamCacheRef.current.set(session.id, { sandboxId: id, streamUrl });
        onSandboxIdReady(session.id, id);

        if (activeSessionRef.current.id !== session.id) {
          return;
        }

        currentSessionIdRef.current = session.id;
        startTransition(() => {
          setSandboxId(id);
          setStream({
            error: null,
            isInitializing: false,
            streamUrl,
          });
        });
      } catch (error) {
        console.error("Failed to prepare desktop", error);
        onDesktopEvent(
          session.id,
          createDesktopLifecycleEvent({
            previousSandboxId: session.sandboxId ?? undefined,
            reason: error instanceof Error ? error.message : "Unknown error",
            sandboxId: session.sandboxId ?? undefined,
            sessionId: session.id,
            type: "desktop_error",
          }),
        );
        toast.error("Failed to connect a desktop", {
          description: "Try creating a new desktop.",
          position: "top-center",
          richColors: true,
        });

        startTransition(() => {
          setSandboxId((current) =>
            currentSessionIdRef.current === session.id ? current : null,
          );
          setStream({
            error: error instanceof Error ? error.message : "Unknown error",
            isInitializing: false,
            streamUrl: null,
          });
        });
      } finally {
        inFlightRef.current = false;

        if (activeSessionRef.current.id !== session.id) {
          void ensureDesktop(false);
        }
      }
    },
    [onDesktopEvent, onSandboxIdReady],
  );

  const refreshDesktopConnection = useCallback(async () => {
    if (
      SANDBOX_UI_DISABLED ||
      inFlightRef.current ||
      repairInFlightRef.current
    ) {
      return;
    }

    const session = activeSessionRef.current;
    const currentSandboxId = sandboxIdRef.current ?? session.sandboxId ?? null;
    const currentStreamUrl = streamRef.current.streamUrl;

    if (
      !currentSandboxId ||
      !currentStreamUrl ||
      streamRef.current.isInitializing
    ) {
      return;
    }

    repairInFlightRef.current = true;

    try {
      const { id, streamUrl } = await getDesktopURL(currentSandboxId);

      if (id === currentSandboxId && streamUrl === currentStreamUrl) {
        return;
      }

      streamCacheRef.current.set(session.id, { sandboxId: id, streamUrl });
      onSandboxIdReady(session.id, id);
      onDesktopEvent(
        session.id,
        createDesktopLifecycleEvent({
          previousSandboxId: currentSandboxId,
          sandboxId: id,
          sessionId: session.id,
          type: "desktop_connect",
        }),
      );

      if (activeSessionRef.current.id !== session.id) {
        return;
      }

      currentSessionIdRef.current = session.id;
      startTransition(() => {
        setSandboxId(id);
        setStream({
          error: null,
          isInitializing: false,
          streamUrl,
        });
      });
    } catch (error) {
      console.warn("Failed to refresh desktop connection", error);
    } finally {
      repairInFlightRef.current = false;
    }
  }, [onDesktopEvent, onSandboxIdReady]);

  useEffect(() => {
    if (SANDBOX_UI_DISABLED || !isSessionHydrated) {
      return;
    }

    const cancelIdle = scheduleIdleWork(() => {
      void ensureDesktop(false);
    }, 120);

    return cancelIdle;
  }, [activeSession.id, activeSession.sandboxId, ensureDesktop, isSessionHydrated]);

  useEffect(() => {
    if (SANDBOX_UI_DISABLED || !isSessionHydrated) {
      return;
    }

    const runHealthCheck = () => {
      void refreshDesktopConnection();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runHealthCheck();
      }
    };

    const intervalId = window.setInterval(
      runHealthCheck,
      DESKTOP_HEALTH_CHECK_INTERVAL_MS,
    );

    window.addEventListener("focus", runHealthCheck);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", runHealthCheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isSessionHydrated, refreshDesktopConnection]);

  useEffect(() => {
    const validSessionIds = new Set(sessions.map((session) => session.id));

    for (const sessionId of streamCacheRef.current.keys()) {
      if (!validSessionIds.has(sessionId)) {
        streamCacheRef.current.delete(sessionId);
      }
    }
  }, [sessions]);

  const requestDesktop = useCallback(
    (forceNew = false) => {
      void ensureDesktop(forceNew);
    },
    [ensureDesktop],
  );

  if (SANDBOX_UI_DISABLED) {
    return <>{children}</>;
  }

  return (
    <SharedSandboxIdContext.Provider value={sandboxId}>
      <SharedDesktopStreamContext.Provider value={stream}>
        <EnsureDesktopContext.Provider value={requestDesktop}>
          {children}
        </EnsureDesktopContext.Provider>
      </SharedDesktopStreamContext.Provider>
    </SharedSandboxIdContext.Provider>
  );
}
