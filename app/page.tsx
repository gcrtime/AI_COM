"use client";

import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { DesktopWorkspaceSkeleton } from "@/components/dashboard/desktop-workspace-skeleton";
import dynamic from "next/dynamic";
import {
  SharedDesktopProvider,
  useSharedDesktopStream,
  useSharedSandboxId,
} from "@/components/dashboard/shared-desktop-provider";
import { MobileDesktopPanel } from "@/components/dashboard/mobile-desktop-panel";
import { MobileFloatingPanels } from "@/components/dashboard/mobile-floating-panels";
import { MobileSessionDrawer } from "@/components/dashboard/mobile-session-drawer";
import { SessionChatStack } from "@/components/dashboard/session-chat-stack";
import { SessionSidebar } from "@/components/dashboard/session-sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  createSession,
  deriveLatestUserPrompt,
  getListedSessions,
  pruneEmptySessions,
  sanitizeMessagesForStorage,
  SESSION_STORAGE_KEY,
  SESSION_STORAGE_VERSION,
  type AgentEvent,
  type PersistedSessionState,
} from "@/lib/agent-events";
import {
  createBootstrapSessionState,
  loadSessionStateFromStorage,
  scheduleIdleWork,
} from "@/lib/session-storage";
import { SANDBOX_UI_DISABLED } from "@/lib/feature-flags";
import {
  deriveDebugAgentStatus,
  deriveProductAgentStatus,
  type ChatRuntimeStatus,
} from "@/lib/agent-status";
import { cn } from "@/lib/utils";

const SESSION_STORAGE_DEBOUNCE_MS = 800;

const LazyDesktopWorkspace = dynamic(
  () =>
    import("@/components/dashboard/desktop-workspace").then(
      (module) => module.DesktopWorkspace,
    ),
  {
    loading: () => <DesktopWorkspaceSkeleton />,
    ssr: false,
  },
);

function sendKillDesktopBeacon(sandboxId: string | null) {
  if (SANDBOX_UI_DISABLED || !sandboxId || typeof navigator === "undefined") {
    return;
  }

  navigator.sendBeacon(
    `/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}`,
  );
}

function requestKillDesktop(sandboxId: string | null) {
  if (SANDBOX_UI_DISABLED || !sandboxId || typeof window === "undefined") {
    return;
  }

  void fetch(`/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}`, {
    keepalive: true,
    method: "POST",
  });
}

export default function DashboardPage() {
  const [sessionState, setSessionState] = useState(createBootstrapSessionState);
  const [activeDesktopSessionId, setActiveDesktopSessionId] = useState(
    createBootstrapSessionState().activeSessionId,
  );
  const [chatStatuses, setChatStatuses] = useState<
    Record<string, ChatRuntimeStatus>
  >({});
  const [isSessionHydrated, setIsSessionHydrated] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const activeSandboxIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cancelIdle = scheduleIdleWork(() => {
      if (cancelled) {
        return;
      }

      const loaded = loadSessionStateFromStorage();
      startTransition(() => {
        if (!cancelled) {
          setSessionState(loaded);
          setActiveDesktopSessionId(loaded.activeSessionId);
          setIsSessionHydrated(true);
        }
      });
    }, 150);

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, []);

  const handleSandboxIdReady = useCallback((sessionId: string, sandboxId: string) => {
    startTransition(() => {
      setSessionState((currentState) => {
        const sessionIndex = currentState.sessions.findIndex(
          (session) => session.id === sessionId,
        );

        if (sessionIndex === -1) {
          return currentState;
        }

        const session = currentState.sessions[sessionIndex];
        if (session.sandboxId === sandboxId) {
          return currentState;
        }

        const nextSessions = [...currentState.sessions];
        nextSessions[sessionIndex] = {
          ...session,
          sandboxId,
          updatedAt: Date.now(),
        };

        return {
          ...currentState,
          sessions: nextSessions,
        };
      });
    });
  }, []);

  const activeSession =
    sessionState.sessions.find(
      (session) => session.id === sessionState.activeSessionId,
    ) ?? sessionState.sessions[0];

  const desktopSession =
    sessionState.sessions.find(
      (session) => session.id === activeDesktopSessionId,
    ) ?? activeSession;

  const listedSessions = useMemo(
    () => getListedSessions(sessionState.sessions),
    [sessionState.sessions],
  );

  const handlePersistSession = useCallback(
    (
      sessionId: string,
      payload: {
        messages: UIMessage[];
        events: AgentEvent[];
        title: string;
      },
    ) => {
      setSessionState((currentState) => {
        const sessionIndex = currentState.sessions.findIndex(
          (session) => session.id === sessionId,
        );

        if (sessionIndex === -1) {
          return currentState;
        }

        const session = currentState.sessions[sessionIndex];
        const selectedEventId =
          session.selectedEventId &&
          payload.events.some((event) => event.id === session.selectedEventId)
            ? session.selectedEventId
            : (payload.events.at(-1)?.id ?? null);

        if (
          equal(session.messages, payload.messages) &&
          equal(session.events, payload.events) &&
          session.title === payload.title &&
          session.selectedEventId === selectedEventId
        ) {
          return currentState;
        }

        const nextSessions = [...currentState.sessions];
        nextSessions[sessionIndex] = {
          ...session,
          title: payload.title,
          updatedAt: Date.now(),
          messages: payload.messages,
          events: payload.events,
          selectedEventId,
        };

        return {
          ...currentState,
          sessions: nextSessions,
        };
      });
    },
    [],
  );

  const handleAppendSessionEvent = useCallback(
    (sessionId: string, event: AgentEvent) => {
      setSessionState((currentState) => {
        const sessionIndex = currentState.sessions.findIndex(
          (session) => session.id === sessionId,
        );

        if (sessionIndex === -1) {
          return currentState;
        }

        const session = currentState.sessions[sessionIndex];
        if (session.events.some((existingEvent) => existingEvent.id === event.id)) {
          return currentState;
        }

        const nextEvents = [...session.events, event].sort(
          (left, right) => left.timestamp - right.timestamp,
        );
        const nextSessions = [...currentState.sessions];
        nextSessions[sessionIndex] = {
          ...session,
          events: nextEvents,
          selectedEventId: event.id,
          updatedAt: Date.now(),
        };

        return {
          ...currentState,
          sessions: nextSessions,
        };
      });
    },
    [],
  );

  useEffect(() => {
    if (!isSessionHydrated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const listed = getListedSessions(sessionState.sessions);
      const activeSessionId = listed.some(
        (session) => session.id === sessionState.activeSessionId,
      )
        ? sessionState.activeSessionId
        : (listed[0]?.id ?? sessionState.activeSessionId);

      const payload: PersistedSessionState = {
        version: SESSION_STORAGE_VERSION,
        activeSessionId,
        sessions: listed.map((session) => ({
          ...session,
          messages: sanitizeMessagesForStorage(session.messages),
        })),
      };

      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    }, SESSION_STORAGE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isSessionHydrated, sessionState]);

  useEffect(() => {
    if (SANDBOX_UI_DISABLED) {
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(
      navigator.userAgent,
    );
    const eventName = isIOS || isSafari ? "pagehide" : "beforeunload";

    const handleLeave = () => {
      sendKillDesktopBeacon(activeSandboxIdRef.current);
    };

    window.addEventListener(eventName, handleLeave);

    return () => {
      window.removeEventListener(eventName, handleLeave);
    };
  }, []);

  const createNewSession = useCallback(() => {
    let nextSessionId: string | null = null;

    setSessionState((currentState) => {
      const prunedSessions = pruneEmptySessions(currentState.sessions);
      const nextSession = createSession(
        getListedSessions(prunedSessions).length + 1,
      );
      nextSessionId = nextSession.id;

      return {
        ...currentState,
        activeSessionId: nextSession.id,
        sessions: [nextSession, ...prunedSessions],
      };
    });

    if (nextSessionId) {
      setActiveDesktopSessionId(nextSessionId);
    }
  }, []);

  const handleChatStatusChange = useCallback(
    (sessionId: string, status: ChatRuntimeStatus) => {
      setChatStatuses((current) =>
        current[sessionId] === status ? current : { ...current, [sessionId]: status },
      );
    },
    [],
  );

  const selectSession = useCallback((sessionId: string) => {
    setSessionState((currentState) => ({
      ...currentState,
      activeSessionId: sessionId,
      sessions: pruneEmptySessions(currentState.sessions, [sessionId]),
    }));
  }, []);

  useEffect(() => {
    if (!isSessionHydrated) {
      return;
    }

    if (activeDesktopSessionId === activeSession.id) {
      return;
    }

    startTransition(() => {
      setActiveDesktopSessionId(activeSession.id);
    });
  }, [activeDesktopSessionId, activeSession.id, isSessionHydrated]);

  const deleteSession = useCallback((sessionId: string) => {
    const sandboxIdToKill =
      sessionState.sessions.find((session) => session.id === sessionId)?.sandboxId ??
      null;
    let nextDesktopTargetId: string | null = null;

    setSessionState((currentState) => {
      const remainingSessions = currentState.sessions.filter(
        (session) => session.id !== sessionId,
      );

      const remainingListedSessions = getListedSessions(remainingSessions);

      if (remainingListedSessions.length === 0) {
        const replacement = createSession(1);
        nextDesktopTargetId = replacement.id;
        return {
          ...currentState,
          activeSessionId: replacement.id,
          sessions: [replacement],
        };
      }

      nextDesktopTargetId =
        activeDesktopSessionId === sessionId
          ? remainingListedSessions[0].id
          : activeDesktopSessionId;

      return {
        ...currentState,
        activeSessionId:
          currentState.activeSessionId === sessionId
            ? remainingListedSessions[0].id
            : currentState.activeSessionId,
        sessions: pruneEmptySessions(remainingSessions, [
          currentState.activeSessionId === sessionId
            ? remainingListedSessions[0].id
            : currentState.activeSessionId,
        ]),
      };
    });

    setChatStatuses((current) => {
      if (!(sessionId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[sessionId];
      return next;
    });

    if (nextDesktopTargetId) {
      setActiveDesktopSessionId(nextDesktopTargetId);
    }
    requestKillDesktop(sandboxIdToKill);

  }, [activeDesktopSessionId, sessionState.sessions]);

  const setSelectedEventForSession = useCallback(
    (sessionId: string, eventId: string) => {
      setSessionState((currentState) => ({
        ...currentState,
        sessions: currentState.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, selectedEventId: eventId }
            : session,
        ),
      }));
    },
    [],
  );

  const selectEvent = useCallback(
    (eventId: string) => {
      setSelectedEventForSession(activeSession.id, eventId);
    },
    [activeSession.id, setSelectedEventForSession],
  );

  const selectDesktopEvent = useCallback(
    (eventId: string) => {
      setSelectedEventForSession(desktopSession.id, eventId);
    },
    [desktopSession.id, setSelectedEventForSession],
  );

  const selectedDesktopEvent =
    desktopSession.events.find(
      (event) => event.id === desktopSession.selectedEventId,
    ) ?? desktopSession.events.at(-1) ?? null;

  return (
    <SharedDesktopProvider
      activeSession={desktopSession}
      isSessionHydrated={isSessionHydrated}
      onDesktopEvent={handleAppendSessionEvent}
      sessions={sessionState.sessions}
      onSandboxIdReady={handleSandboxIdReady}
    >
      <DashboardShell
        activeSandboxIdRef={activeSandboxIdRef}
        activeSession={activeSession}
        desktopSession={desktopSession}
        createNewSession={createNewSession}
        deleteSession={deleteSession}
        chatStatuses={chatStatuses}
        handleChatStatusChange={handleChatStatusChange}
        handlePersistSession={handlePersistSession}
        isDebugOpen={isDebugOpen}
        isSessionHydrated={isSessionHydrated}
        isSidebarCollapsed={isSidebarCollapsed}
        listedSessions={listedSessions}
        selectDesktopEvent={selectDesktopEvent}
        selectEvent={selectEvent}
        selectSession={selectSession}
        selectedDesktopEventId={selectedDesktopEvent?.id ?? null}
        sessions={sessionState.sessions}
        setIsDebugOpen={setIsDebugOpen}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
    </SharedDesktopProvider>
  );
}

function DashboardShell({
  activeSandboxIdRef,
  activeSession,
  desktopSession,
  createNewSession,
  deleteSession,
  chatStatuses,
  handleChatStatusChange,
  handlePersistSession,
  isDebugOpen,
  isSessionHydrated,
  isSidebarCollapsed,
  listedSessions,
  selectDesktopEvent,
  selectEvent,
  selectSession,
  selectedDesktopEventId,
  sessions,
  setIsDebugOpen,
  setIsSidebarCollapsed,
}: {
  activeSandboxIdRef: MutableRefObject<string | null>;
  activeSession: PersistedSessionState["sessions"][number];
  desktopSession: PersistedSessionState["sessions"][number];
  createNewSession: () => void;
  deleteSession: (sessionId: string) => void;
  chatStatuses: Record<string, ChatRuntimeStatus>;
  handleChatStatusChange: (
    sessionId: string,
    status: ChatRuntimeStatus,
  ) => void;
  handlePersistSession: (
    sessionId: string,
    payload: {
      messages: UIMessage[];
      events: AgentEvent[];
      title: string;
    },
  ) => void;
  isDebugOpen: boolean;
  isSessionHydrated: boolean;
  isSidebarCollapsed: boolean;
  listedSessions: PersistedSessionState["sessions"];
  selectDesktopEvent: (eventId: string) => void;
  selectEvent: (eventId: string) => void;
  selectSession: (sessionId: string) => void;
  selectedDesktopEventId: string | null;
  sessions: PersistedSessionState["sessions"];
  setIsDebugOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setIsSidebarCollapsed: (
    value: boolean | ((current: boolean) => boolean),
  ) => void;
}) {
  const sharedSandboxId = useSharedSandboxId();
  const desktopStream = useSharedDesktopStream();

  useEffect(() => {
    activeSandboxIdRef.current = sharedSandboxId;
  }, [activeSandboxIdRef, sharedSandboxId]);

  const chatStatus = chatStatuses[activeSession.id] ?? "ready";
  const debugAgentStatus = SANDBOX_UI_DISABLED
    ? "completed"
    : deriveDebugAgentStatus({
        chatStatus,
        desktopError:
          activeSession.id === desktopSession.id ? desktopStream.error : null,
        desktopInitializing:
          activeSession.id === desktopSession.id &&
          desktopStream.isInitializing &&
          !desktopStream.streamUrl,
        events: activeSession.events,
        messages: activeSession.messages,
      });
  const productAgentStatus = SANDBOX_UI_DISABLED
    ? "Ready"
    : deriveProductAgentStatus(debugAgentStatus);
  const desktopTitle = useMemo(
    () => deriveLatestUserPrompt(desktopSession.messages, desktopSession.title),
    [desktopSession.messages, desktopSession.title],
  );

  return (
    <div className="h-dvh overflow-hidden text-zinc-950">
      <div className="hidden h-full min-h-0 overflow-hidden lg:block">
        <ResizablePanelGroup className="min-h-0" direction="horizontal">
          <ResizablePanel
            className="min-h-0 overflow-hidden"
            defaultSize={58}
            minSize={42}
          >
            <div
              className={cn(
                "grid h-full min-h-0 overflow-hidden",
                isSidebarCollapsed
                  ? "grid-cols-1"
                  : "grid-cols-[260px_minmax(0,1fr)]",
              )}
            >
              {!isSidebarCollapsed ? (
                <div className="min-h-0 overflow-hidden">
                  <SessionSidebar
                    activeSessionId={activeSession.id}
                    onCollapse={() => setIsSidebarCollapsed(true)}
                    onCreateSession={createNewSession}
                    onDeleteSession={deleteSession}
                    onSelectSession={selectSession}
                    sessions={listedSessions}
                  />
                </div>
              ) : null}

              <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                <SessionChatStack
                  activeSessionId={activeSession.id}
                  debugAgentStatus={debugAgentStatus}
                  isDebugOpen={isDebugOpen}
                  isSessionHydrated={isSessionHydrated}
                  isSidebarCollapsed={isSidebarCollapsed}
                  listedSessions={listedSessions}
                  onCreateSession={createNewSession}
                  onChatStatusChange={handleChatStatusChange}
                  onExpandSidebar={() => setIsSidebarCollapsed(false)}
                  onPersist={handlePersistSession}
                  onSelectEvent={selectEvent}
                  onToggleDebug={() =>
                    setIsDebugOpen((currentValue) => !currentValue)
                  }
                  agentStatus={productAgentStatus}
                  sessions={sessions}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            className="min-h-0 overflow-hidden"
            defaultSize={42}
            minSize={28}
          >
            {isSessionHydrated ? (
              <LazyDesktopWorkspace
                agentStatus={
                  desktopSession.id === activeSession.id ? debugAgentStatus : "idle"
                }
                events={desktopSession.events}
                onSelectEvent={selectDesktopEvent}
                selectedEventId={selectedDesktopEventId}
                sessionId={desktopSession.id}
                title={desktopTitle}
              />
            ) : (
              <DesktopWorkspaceSkeleton />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <MobileDashboard
        activeSession={activeSession}
        chatStatuses={chatStatuses}
        createNewSession={createNewSession}
        debugAgentStatus={debugAgentStatus}
        deleteSession={deleteSession}
        desktopSession={desktopSession}
        desktopTitle={desktopTitle}
        isDebugOpen={isDebugOpen}
        isSessionHydrated={isSessionHydrated}
        listedSessions={listedSessions}
        onChatStatusChange={handleChatStatusChange}
        onPersist={handlePersistSession}
        onSelectDesktopEvent={selectDesktopEvent}
        onSelectEvent={selectEvent}
        onToggleDebug={() => setIsDebugOpen((currentValue) => !currentValue)}
        agentStatus={productAgentStatus}
        selectSession={selectSession}
        selectedDesktopEventId={selectedDesktopEventId}
        sessions={sessions}
      />
    </div>
  );
}

function MobileDashboard({
  listedSessions,
  activeSession,
  chatStatuses,
  debugAgentStatus,
  deleteSession,
  desktopSession,
  desktopTitle,
  isDebugOpen,
  isSessionHydrated,
  createNewSession,
  selectSession,
  onChatStatusChange,
  onSelectDesktopEvent,
  onSelectEvent,
  onPersist,
  onToggleDebug,
  agentStatus,
  selectedDesktopEventId,
  sessions,
}: {
  listedSessions: PersistedSessionState["sessions"];
  activeSession: PersistedSessionState["sessions"][number];
  chatStatuses: Record<string, ChatRuntimeStatus>;
  debugAgentStatus: ReturnType<typeof deriveDebugAgentStatus>;
  deleteSession: (sessionId: string) => void;
  desktopSession: PersistedSessionState["sessions"][number];
  desktopTitle: string;
  isDebugOpen: boolean;
  isSessionHydrated: boolean;
  createNewSession: () => void;
  selectSession: (sessionId: string) => void;
  onChatStatusChange: (
    sessionId: string,
    status: ChatRuntimeStatus,
  ) => void;
  onSelectDesktopEvent: (eventId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onPersist: (
    sessionId: string,
    payload: {
      messages: UIMessage[];
      events: AgentEvent[];
      title: string;
    },
  ) => void;
  onToggleDebug: () => void;
  agentStatus: ReturnType<typeof deriveProductAgentStatus>;
  selectedDesktopEventId: string | null;
  sessions: PersistedSessionState["sessions"];
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const showMobileDesktop = useMemo(() => {
    if (desktopSession.events.length > 0) {
      return true;
    }

    return desktopSession.messages.some((message) =>
      (message.parts ?? []).some((part) => part.type === "tool-invocation"),
    );
  }, [desktopSession.events.length, desktopSession.messages]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="relative flex h-full min-h-0 flex-col lg:hidden">
      <MobileSessionDrawer
        activeSessionId={activeSession.id}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onCreateSession={createNewSession}
        onDeleteSession={deleteSession}
        onSelectSession={selectSession}
        sessions={listedSessions}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <SessionChatStack
          activeSessionId={activeSession.id}
          agentStatus={agentStatus}
          debugAgentStatus={debugAgentStatus}
          isDebugOpen={isDebugOpen}
          isMobile
          isSessionHydrated={isSessionHydrated}
          listedSessions={listedSessions}
          onChatStatusChange={onChatStatusChange}
          onCreateSession={createNewSession}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onPersist={onPersist}
          onSelectEvent={onSelectEvent}
          onToggleDebug={onToggleDebug}
          sessions={sessions}
        />
      </div>

      <MobileDesktopPanel
        sessionId={desktopSession.id}
        title={desktopTitle}
        visible={showMobileDesktop}
      />

      <MobileFloatingPanels
        activityAgentStatus={
          desktopSession.id === activeSession.id ? debugAgentStatus : "idle"
        }
        chatStatus={chatStatuses[activeSession.id] ?? "ready"}
        debugAgentStatus={debugAgentStatus}
        desktopReady={Boolean(activeSession.sandboxId)}
        events={desktopSession.events}
        onSelectEvent={onSelectDesktopEvent}
        productAgentStatus={agentStatus}
        selectedEventId={selectedDesktopEventId}
      />
    </div>
  );
}
