"use client";

import type { LucideIcon } from "lucide-react";
import type { AgentEvent, AgentEventStatus } from "@/lib/agent-events";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ABORTED, cn } from "@/lib/utils";
import {
  getToolErrorMessage,
} from "@/lib/tool-invocation-state";
import {
  Activity,
  Camera,
  ChevronRight,
  CircleSlash,
  Clock3,
  Laptop,
  Keyboard,
  KeyRound,
  Loader2,
  MousePointer,
  MousePointerClick,
  ScrollText,
  TerminalSquare,
} from "lucide-react";

type ToolInspectorProps = {
  agentStatus: string;
  events: AgentEvent[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

function getActionIcon(actionType: string): LucideIcon {
  switch (actionType) {
    case "screenshot":
      return Camera;
    case "left_click":
    case "mouse_move":
      return MousePointer;
    case "right_click":
    case "double_click":
    case "triple_click":
      return MousePointerClick;
    case "type":
      return Keyboard;
    case "key":
      return KeyRound;
    case "wait":
      return Clock3;
    case "scroll":
      return ScrollText;
    case "bash":
      return TerminalSquare;
    case "desktop_boot":
    case "desktop_connect":
    case "desktop_reset":
    case "desktop_error":
      return Laptop;
    default:
      return Activity;
  }
}

function formatTime(timestamp: number | null): string {
  if (timestamp === null) {
    return "…";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return "Running";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

function statusMeta(status: AgentEventStatus) {
  switch (status) {
    case "pending":
      return {
        label: "Running",
        dot: "bg-sky-500",
        badge: "bg-sky-50 text-sky-700 ring-sky-100",
      };
    case "error":
      return {
        label: "Failed",
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-700 ring-red-100",
      };
    case "complete":
    default:
      return {
        label: "Done",
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };
  }
}

function agentStatusMeta(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("error")) {
    return { label: "Error", dot: "bg-red-500", text: "text-red-700" };
  }

  if (
    normalized.includes("booting") ||
    normalized.includes("running") ||
    normalized.includes("streaming")
  ) {
    return { label: "Working", dot: "bg-sky-500 animate-pulse", text: "text-sky-700" };
  }

  if (normalized.includes("completed") || normalized.includes("ready")) {
    return { label: "Ready", dot: "bg-emerald-500", text: "text-emerald-700" };
  }

  return { label: status, dot: "bg-zinc-400", text: "text-zinc-600" };
}

function summarizeEventCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return "No actions yet";
  }

  return entries
    .slice(0, 4)
    .map(([key, count]) => `${count} ${key.replace(/_/g, " ")}`)
    .join(" · ");
}

function ScreenshotResult({ data }: { data: string }) {
  const src = `data:image/png;base64,${data}`;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Screenshot full size"
        className="block w-full max-w-none"
        src={src}
      />
    </div>
  );
}

function EventResult({ result }: { result: unknown }) {
  if (result === ABORTED) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-100">
        <CircleSlash className="size-4 shrink-0" />
        User stopped this action
      </div>
    );
  }

  const errorMessage = getToolErrorMessage(result);
  if (errorMessage) {
    return (
      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-800 ring-1 ring-red-100">
        {errorMessage}
      </div>
    );
  }

  if (typeof result === "string") {
    return (
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950/5 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-700">
        {result}
      </pre>
    );
  }

  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;

    if (record.type === "image" && typeof record.data === "string") {
      return <ScreenshotResult data={record.data} />;
    }

    if (record.type === "text" && typeof record.text === "string") {
      return (
        <p className="rounded-lg bg-zinc-950/5 px-3 py-2 text-sm leading-relaxed text-zinc-700">
          {record.text}
        </p>
      );
    }
  }

  return (
    <pre className="max-h-32 overflow-auto rounded-lg bg-zinc-950/5 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-600">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

function EventDetail({ event }: { event: AgentEvent }) {
  const status = statusMeta(event.status);
  const Icon = getActionIcon(event.type);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-semibold text-zinc-950">
                {event.label}
              </h4>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                  status.badge,
                )}
              >
                {status.label}
              </span>
            </div>
            {event.detail ? (
              <p className="mt-0.5 truncate text-xs text-zinc-500">{event.detail}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-zinc-400">
              {formatDuration(event.duration)} · {formatTime(event.timestamp)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <section>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Result
          </p>
          {event.result !== null && event.result !== undefined ? (
            <EventResult result={event.result} />
          ) : event.status === "pending" ? (
            <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
              <Loader2 className="size-4 animate-spin" />
              Waiting for output…
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No result captured.</p>
          )}
        </section>

        <details className="group rounded-lg border border-zinc-200 bg-zinc-50/80">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-zinc-700 marker:content-none [&::-webkit-details-marker]:hidden">
            <span>Payload</span>
            <ChevronRight className="size-4 text-zinc-400 transition-transform group-open:rotate-90" />
          </summary>
          <pre className="max-h-28 overflow-auto border-t border-zinc-200 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-600">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

export function ToolInspector({
  agentStatus,
  events,
  selectedEventId,
  onSelectEvent,
}: ToolInspectorProps) {
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? events.at(-1) ?? null;
  const eventCounts = events.reduce<Record<string, number>>((counts, event) => {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
    return counts;
  }, {});
  const agentMeta = agentStatusMeta(agentStatus);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f8fbff]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 bg-white/90 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("size-2 shrink-0 rounded-full", agentMeta.dot)} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900">Activity</p>
            <p className={cn("truncate text-xs", agentMeta.text)}>
              {agentMeta.label}
              {events.length > 0 ? (
                <span className="text-zinc-400">
                  {" "}
                  · {summarizeEventCounts(eventCounts)}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-[#edf4ff] px-2.5 py-1 text-xs font-medium text-[#4966be]">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-r border-zinc-200/80 bg-white">
          <ScrollArea
            className="custom-scroll custom-scroll-visible min-h-0 flex-1"
            contentClassName="px-2 py-2"
          >
            {events.length === 0 ? (
              <div className="mx-1 rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center">
                <Activity className="mx-auto size-5 text-zinc-300" />
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Tool calls will appear here as the agent works.
                </p>
              </div>
            ) : (
              <ol className="relative space-y-1 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-px before:bg-zinc-200">
                {[...events].reverse().map((event) => {
                  const isSelected = event.id === selectedEvent?.id;
                  const status = statusMeta(event.status);
                  const Icon = getActionIcon(event.type);

                  return (
                    <li key={event.id} className="relative">
                      <button
                        className={cn(
                          "relative flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-[#edf4ff] text-[#24459a] shadow-[var(--shadow-soft)]"
                            : "hover:bg-zinc-100",
                        )}
                        onClick={() => onSelectEvent(event.id)}
                        type="button"
                      >
                        <span
                          className={cn(
                            "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg ring-2 ring-white",
                            isSelected
                              ? "bg-white text-[#3f5fb8]"
                              : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          <Icon className="size-3.5" />
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-white",
                              status.dot,
                            )}
                          />
                        </span>
                        <span className="min-w-0 flex-1 pt-0.5">
                          <span className="block truncate text-xs font-medium">
                            {event.label}
                          </span>
                          {event.detail ? (
                            <span
                              className={cn(
                                "mt-0.5 block truncate text-[11px]",
                                isSelected ? "text-[#6282d4]" : "text-zinc-500",
                              )}
                            >
                              {event.detail}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "mt-1 block text-[10px]",
                              isSelected ? "text-[#7a95da]" : "text-zinc-400",
                            )}
                          >
                            {formatTime(event.timestamp)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </ScrollArea>
        </div>

        <ScrollArea className="custom-scroll custom-scroll-visible min-h-0 bg-white">
          {selectedEvent ? (
            <EventDetail event={selectedEvent} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <Activity className="size-5 text-zinc-300" />
              <p className="mt-2 text-sm text-zinc-500">
                Select an event to inspect its result.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
