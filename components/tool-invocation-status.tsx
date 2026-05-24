"use client";

import type { ReactNode } from "react";
import {
  CheckCircle2,
  CircleSlash,
  Loader2,
  StopCircle,
  XCircle,
} from "lucide-react";

import type { ToolInvocationVisualState } from "@/lib/tool-invocation-state";
import { cn } from "@/lib/utils";

export function getToolCardClassName(
  visualState: ToolInvocationVisualState,
  selected: boolean,
): string {
  const base =
    "mb-3 flex w-full rounded-md border p-2 text-left text-sm transition-colors";

  if (selected) {
    return cn(base, "border-zinc-900 bg-zinc-100 ring-1 ring-zinc-900/10");
  }

  switch (visualState) {
    case "pending":
      return cn(
        base,
        "border-sky-200 bg-sky-50/60 dark:border-sky-900/40 dark:bg-sky-950/20",
      );
    case "error":
      return cn(
        base,
        "border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20",
      );
    case "aborted":
      return cn(
        base,
        "border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20",
      );
    case "complete":
    default:
      return cn(
        base,
        "border-emerald-200/80 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900",
      );
  }
}

export function ToolStatusBadge({
  visualState,
}: {
  visualState: ToolInvocationVisualState;
}) {
  const config: Record<
    ToolInvocationVisualState,
    { label: string; className: string }
  > = {
    pending: {
      label: "Running",
      className: "bg-sky-100 text-sky-700 ring-sky-200",
    },
    complete: {
      label: "Done",
      className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    },
    error: {
      label: "Failed",
      className: "bg-red-100 text-red-700 ring-red-200",
    },
    aborted: {
      label: "Stopped",
      className: "bg-amber-100 text-amber-700 ring-amber-200",
    },
  };

  const { label, className } = config[visualState];

  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function ToolStatusIcon({
  visualState,
  showSpinner,
}: {
  visualState: ToolInvocationVisualState;
  showSpinner: boolean;
}) {
  const iconClass = "h-4 w-4";

  if (visualState === "pending") {
    return showSpinner ? (
      <Loader2 className={cn(iconClass, "animate-spin text-sky-600")} />
    ) : (
      <StopCircle className={cn(iconClass, "text-sky-500")} />
    );
  }

  if (visualState === "error") {
    return <XCircle className={cn(iconClass, "text-red-600")} />;
  }

  if (visualState === "aborted") {
    return <CircleSlash className={cn(iconClass, "text-amber-600")} />;
  }

  return <CheckCircle2 className={cn(iconClass, "text-emerald-600")} />;
}

export function ToolIconShell({
  children,
  visualState,
}: {
  children: ReactNode;
  visualState: ToolInvocationVisualState;
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        visualState === "pending" && "bg-sky-100 text-sky-700",
        visualState === "complete" && "bg-zinc-50 text-zinc-700 dark:bg-zinc-800",
        visualState === "error" && "bg-red-100 text-red-700",
        visualState === "aborted" && "bg-amber-100 text-amber-700",
      )}
    >
      {children}
    </div>
  );
}

export function formatToolDuration(
  durationMs: number | null | undefined,
  visualState: ToolInvocationVisualState,
): string | null {
  if (durationMs !== null && durationMs !== undefined) {
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    }

    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  if (visualState === "pending") {
    return "Running";
  }

  return null;
}

export function ToolDurationLabel({
  durationMs,
  visualState,
}: {
  durationMs: number | null | undefined;
  visualState: ToolInvocationVisualState;
}) {
  const label = formatToolDuration(durationMs, visualState);

  if (!label) {
    return null;
  }

  return (
    <span className="text-[11px] font-normal tabular-nums text-zinc-400">
      {label}
    </span>
  );
}
