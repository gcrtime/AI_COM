"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/lib/agent-events";
import { DeployIconButton } from "@/components/project-info";
import { MessageSquarePlus, PanelLeftClose, Trash2 } from "lucide-react";

type SessionSidebarProps = {
  sessions: ChatSession[];
  activeSessionId: string;
  onCollapse: () => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
};

function formatUpdatedAt(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onCollapse,
  onCreateSession,
  onDeleteSession,
  onSelectSession,
}: SessionSidebarProps) {
  return (
    <aside className="flex h-full flex-col bg-[var(--surface-sidebar)] shadow-[var(--shadow-soft)]">
      <div className="px-4 py-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-xl font-semibold text-zinc-950">
            Workspace
          </h2>
          <Button
            aria-label="Collapse sidebar"
            className="size-8 shrink-0 rounded-xl text-zinc-500 hover:bg-white/80"
            onClick={onCollapse}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </div>
        <Button
          className="w-full justify-start rounded-2xl bg-white/90 shadow-[var(--shadow-soft)]"
          onClick={onCreateSession}
          variant="outline"
        >
          <MessageSquarePlus />
          New session
        </Button>
      </div>

      <div className="custom-scroll flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;

            return (
              <button
                key={session.id}
                className={cn(
                  "w-full rounded-2xl border px-3 py-3 text-left shadow-[var(--shadow-soft)] transition-all duration-150",
                  isActive
                    ? "border-[#c9d9ff] bg-[#edf4ff] text-[#2b4fb5]"
                    : "border-transparent bg-white/92 hover:bg-white",
                )}
                onClick={() => onSelectSession(session.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {session.title}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        isActive ? "text-[#6282d4]" : "text-zinc-500",
                      )}
                    >
                      Updated {formatUpdatedAt(session.updatedAt)}
                    </p>
                  </div>
                  <button
                    aria-label={`Delete ${session.title}`}
                    className={cn(
                      "rounded-lg p-1.5 transition-colors",
                      isActive
                        ? "text-[#6282d4] hover:bg-white/70 hover:text-[#2b4fb5]"
                        : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3">
        <DeployIconButton />
      </div>
    </aside>
  );
}
