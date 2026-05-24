"use client";

import type { AgentEvent } from "@/lib/agent-events";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Bug, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";

type DebugPanelProps = {
  eventCounts: Record<string, number>;
  events: AgentEvent[];
  isOpen: boolean;
  onToggle: () => void;
  statusSummary: {
    chatStatus: string;
    debugAgentStatus: string;
    desktopReady: boolean;
    productAgentStatus: string;
    selectedEventId: string | null;
  };
};

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function StatusTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "error" | "info";
}) {
  const toneClass = {
    neutral: "bg-white text-zinc-700 ring-zinc-100",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    warning: "bg-amber-50 text-amber-700 ring-amber-100",
    error: "bg-red-50 text-red-700 ring-red-100",
    info: "bg-sky-50 text-sky-700 ring-sky-100",
  }[tone];

  return (
    <div className={cn("rounded-xl px-3 py-2 ring-1 ring-inset", toneClass)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function toneForStatus(value: string): "neutral" | "success" | "warning" | "error" | "info" {
  const normalized = value.toLowerCase();

  if (normalized.includes("error")) {
    return "error";
  }

  if (
    normalized.includes("ready") ||
    normalized.includes("completed") ||
    normalized.includes("idle")
  ) {
    return "success";
  }

  if (
    normalized.includes("streaming") ||
    normalized.includes("running") ||
    normalized.includes("thinking") ||
    normalized.includes("tool")
  ) {
    return "info";
  }

  if (normalized.includes("booting") || normalized.includes("submitted")) {
    return "warning";
  }

  return "neutral";
}

function RawJsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="group rounded-xl border border-zinc-100 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-zinc-700 marker:content-none [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <ChevronRight className="size-4 text-zinc-500 transition-transform group-open:rotate-90" />
      </summary>
      <ScrollArea className="custom-scroll custom-scroll-visible max-h-40 border-t border-zinc-100">
        <pre className="px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-500">
          {JSON.stringify(value, null, 2)}
        </pre>
      </ScrollArea>
    </details>
  );
}

export function DebugPanel({
  eventCounts,
  events,
  isOpen,
  onToggle,
  statusSummary,
}: DebugPanelProps) {
  const countEntries = Object.entries(eventCounts);

  return (
    <div className="border-t border-[#d9e5fb] bg-[#eef4ff] text-zinc-900">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/70"
        onClick={onToggle}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#edf4ff] text-[#4a67bf]">
            <Bug className="size-3.5" />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-900">Debug</p>
            <p className="truncate text-xs text-zinc-500">
              {statusSummary.debugAgentStatus} · {events.length} events
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-white/90 px-2 py-0.5 text-[11px] text-zinc-500 shadow-[var(--shadow-soft)] sm:inline">
            {isOpen ? "Collapse" : "Expand"}
          </span>
          {isOpen ? (
            <ChevronDown className="size-4 text-zinc-400" />
          ) : (
            <ChevronUp className="size-4 text-zinc-400" />
          )}
        </div>
      </button>

      {isOpen ? (
        <div className="space-y-3 border-t border-[#d9e5fb] px-4 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatusTile
              label="Chat"
              tone={toneForStatus(statusSummary.chatStatus)}
              value={statusSummary.chatStatus}
            />
            <StatusTile
              label="Agent"
              tone={toneForStatus(statusSummary.productAgentStatus)}
              value={statusSummary.productAgentStatus}
            />
            <StatusTile
              label="Debug"
              tone={toneForStatus(statusSummary.debugAgentStatus)}
              value={statusSummary.debugAgentStatus}
            />
            <StatusTile
              label="Desktop"
              tone={statusSummary.desktopReady ? "success" : "warning"}
              value={statusSummary.desktopReady ? "Connected" : "Not ready"}
            />
          </div>

          {countEntries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {countEntries.map(([key, count]) => (
                <span
                  key={key}
                  className="rounded-full bg-white px-2 py-0.5 text-[11px] text-zinc-600 ring-1 ring-zinc-100"
                >
                  {key.replace(/_/g, " ")} · {count}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="min-h-0 rounded-xl border border-zinc-100 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                <p className="text-xs font-medium text-zinc-700">Event timeline</p>
                <span className="text-[11px] text-zinc-500">{events.length} total</span>
              </div>
              <ScrollArea className="custom-scroll custom-scroll-visible max-h-44">
                {events.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-zinc-500">No events recorded yet.</p>
                ) : (
                  <ol className="divide-y divide-zinc-100">
                    {[...events].reverse().map((event, index) => (
                      <li
                        key={event.id}
                        className={cn(
                          "px-3 py-2 text-xs",
                          event.id === statusSummary.selectedEventId && "bg-[#edf4ff]",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-zinc-700">
                            {events.length - index}. {event.label}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ring-1 ring-inset",
                              event.status === "complete" &&
                                "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
                              event.status === "pending" &&
                                "bg-sky-500/10 text-sky-300 ring-sky-500/20",
                              event.status === "error" &&
                                "bg-red-500/10 text-red-300 ring-red-500/20",
                            )}
                          >
                            {event.status}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {event.detail || event.type} · {formatTime(event.timestamp)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </ScrollArea>
            </section>

            <div className="space-y-2">
              <RawJsonBlock
                label="Derived state"
                value={{
                  statusSummary,
                  totalEvents: events.length,
                  eventCounts,
                }}
              />
              <RawJsonBlock label="Event store" value={events} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
