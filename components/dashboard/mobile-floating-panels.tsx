"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bug, ChevronDown, X } from "lucide-react";

import { DebugPanel } from "@/components/dashboard/debug-panel";
import { ToolInspector } from "@/components/dashboard/tool-inspector";
import type { AgentEvent } from "@/lib/agent-events";
import type {
  DebugAgentStatus,
  ProductAgentStatus,
  ChatRuntimeStatus,
} from "@/lib/agent-status";
import { cn } from "@/lib/utils";

type MobileFloatingPanelsProps = {
  activityAgentStatus: string;
  chatStatus: ChatRuntimeStatus;
  debugAgentStatus: DebugAgentStatus;
  desktopReady: boolean;
  events: AgentEvent[];
  onSelectEvent: (eventId: string) => void;
  productAgentStatus: ProductAgentStatus;
  selectedEventId: string | null;
};

export function MobileFloatingPanels({
  activityAgentStatus,
  chatStatus,
  debugAgentStatus,
  desktopReady,
  events,
  onSelectEvent,
  productAgentStatus,
  selectedEventId,
}: MobileFloatingPanelsProps) {
  const [openPanel, setOpenPanel] = useState<"activity" | "debug" | null>(null);

  useEffect(() => {
    if (!openPanel) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openPanel]);

  const eventCounts = useMemo(() => {
    return events.reduce<Record<string, number>>((counts, event) => {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
      return counts;
    }, {});
  }, [events]);

  return (
    <>
      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-[80] flex flex-col gap-2 lg:hidden">
        <button
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/96 px-3 py-2 text-sm font-medium text-zinc-700 shadow-[var(--shadow-float)]"
          onClick={() => setOpenPanel("activity")}
          type="button"
        >
          <Activity className="size-4 text-[#3f67d7]" />
          Activity
        </button>
        <button
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/96 px-3 py-2 text-sm font-medium text-zinc-700 shadow-[var(--shadow-float)]"
          onClick={() => setOpenPanel("debug")}
          type="button"
        >
          <Bug className="size-4 text-[#3f67d7]" />
          Debug
        </button>
      </div>

      <button
        aria-label="Close panel overlay"
        className={cn(
          "fixed inset-0 z-[85] bg-black/18 transition-opacity lg:hidden",
          openPanel ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpenPanel(null)}
        tabIndex={openPanel ? 0 : -1}
        type="button"
      />

      <section
        aria-hidden={!openPanel}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] max-h-[74dvh] translate-y-full overflow-hidden rounded-t-[28px] bg-[#f8fbff] shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          openPanel && "translate-y-0",
        )}
      >
        {openPanel === "debug" ? (
          <DebugPanel
            eventCounts={eventCounts}
            events={events}
            isOpen
            onToggle={() => setOpenPanel(null)}
            statusSummary={{
              chatStatus,
              debugAgentStatus,
              desktopReady,
              productAgentStatus,
              selectedEventId,
            }}
          />
        ) : null}

        {openPanel === "activity" ? (
          <div className="flex max-h-[74dvh] min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Tool activity
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {events.length} {events.length === 1 ? "event" : "events"}
                </p>
              </div>
              <button
                aria-label="Close tool activity"
                className="rounded-full bg-zinc-100 p-2 text-zinc-500 transition-colors hover:bg-zinc-200"
                onClick={() => setOpenPanel(null)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="shrink-0 border-b border-zinc-100 bg-[#f8fbff] px-4 py-2 text-right">
              <button
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-500 shadow-[var(--shadow-soft)]"
                onClick={() => setOpenPanel(null)}
                type="button"
              >
                Close
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <ToolInspector
                agentStatus={activityAgentStatus}
                events={events}
                onSelectEvent={onSelectEvent}
                selectedEventId={selectedEventId}
              />
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
