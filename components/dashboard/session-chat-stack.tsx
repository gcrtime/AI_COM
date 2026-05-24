"use client";

import type { ComponentProps } from "react";
import { useMemo } from "react";

import { ChatPanel } from "@/components/dashboard/chat-panel";
import { ChatPanelSkeleton } from "@/components/dashboard/chat-panel-skeleton";
import { type ChatSession } from "@/lib/agent-events";

type SessionChatStackProps = {
  activeSessionId: string;
  isSessionHydrated: boolean;
  listedSessions: ChatSession[];
  sessions: ChatSession[];
} & Omit<ComponentProps<typeof ChatPanel>, "sandboxId" | "session">;

export function SessionChatStack({
  activeSessionId,
  isSessionHydrated,
  listedSessions,
  sessions,
  ...chatPanelProps
}: SessionChatStackProps) {
  const activeSession = useMemo(() => {
    return (
      sessions.find((session) => session.id === activeSessionId) ??
      listedSessions.find((session) => session.id === activeSessionId) ??
      sessions[0] ??
      listedSessions[0] ??
      null
    );
  }, [activeSessionId, listedSessions, sessions]);

  if (!isSessionHydrated || !activeSession) {
    return <ChatPanelSkeleton />;
  }

  return (
    <div className="relative h-full min-h-0">
      <div className="relative flex h-full min-h-0 flex-col">
        <ChatPanel
          key={activeSession.id}
          {...chatPanelProps}
          sandboxId={activeSession.sandboxId}
          session={activeSession}
        />
      </div>
    </div>
  );
}
