"use client";

import { SessionSidebar } from "@/components/dashboard/session-sidebar";
import type { ChatSession } from "@/lib/agent-events";
import { cn } from "@/lib/utils";

type MobileSessionDrawerProps = {
  activeSessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  sessions: ChatSession[];
};

export function MobileSessionDrawer({
  activeSessionId,
  isOpen,
  onClose,
  onCreateSession,
  onDeleteSession,
  onSelectSession,
  sessions,
}: MobileSessionDrawerProps) {
  return (
    <>
      <button
        aria-label="Close session menu"
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(85vw,280px)] shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SessionSidebar
          activeSessionId={activeSessionId}
          onCollapse={onClose}
          onCreateSession={() => {
            onCreateSession();
            onClose();
          }}
          onDeleteSession={onDeleteSession}
          onSelectSession={(sessionId) => {
            onSelectSession(sessionId);
            onClose();
          }}
          sessions={sessions}
        />
      </aside>
    </>
  );
}
