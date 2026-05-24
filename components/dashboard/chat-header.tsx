"use client";

import { Button } from "@/components/ui/button";
import type { ProductAgentStatus } from "@/lib/agent-status";
import { PanelLeftOpen, Plus } from "lucide-react";

type ChatHeaderProps = {
  title: string;
  agentStatus: ProductAgentStatus;
  isSidebarCollapsed?: boolean;
  isMobile?: boolean;
  onExpandSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
  onCreateSession?: () => void;
};

export function ChatHeader({
  title,
  agentStatus,
  isSidebarCollapsed = false,
  isMobile = false,
  onExpandSidebar,
  onOpenMobileSidebar,
  onCreateSession,
}: ChatHeaderProps) {
  if (isMobile) {
    return (
      <header className="flex shrink-0 items-center gap-3 bg-transparent px-4 pb-3 pt-3">
        <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-white/90 p-1 shadow-[var(--shadow-soft)]">
          <Button
            aria-label="Open session menu"
            className="size-8 rounded-lg"
            onClick={onOpenMobileSidebar}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
          <Button
            aria-label="New session"
            className="size-8 rounded-lg"
            onClick={onCreateSession}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-zinc-950">
          {title}
        </h1>
        <StatusPill status={agentStatus} />
      </header>
    );
  }

  if (isSidebarCollapsed) {
    return (
      <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-4">
        <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-white/90 p-1 shadow-[var(--shadow-soft)]">
          <Button
            aria-label="Expand sidebar"
            className="size-8 rounded-lg"
            onClick={onExpandSidebar}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
          <Button
            aria-label="New session"
            className="size-8 rounded-lg"
            onClick={onCreateSession}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-zinc-950">
          {title}
        </h1>
        <StatusPill status={agentStatus} />
      </header>
    );
  }

  return (
    <header className="shrink-0 px-6 pb-3 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-zinc-950">
          {title}
        </h1>
        <StatusPill status={agentStatus} />
      </div>
    </header>
  );
}

function StatusPill({ status }: { status: ProductAgentStatus }) {
  const tone =
    status === "Error"
      ? "bg-red-50 text-red-700"
      : status === "Using tools"
        ? "bg-amber-50 text-amber-700"
        : status === "Thinking"
          ? "bg-blue-50 text-blue-700"
          : status === "Ready"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-zinc-100 text-zinc-600";

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium shadow-[var(--shadow-soft)] ${tone}`}
    >
      {status}
    </span>
  );
}
