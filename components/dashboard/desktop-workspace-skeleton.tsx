"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

function DesktopPanelSkeleton() {
  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <Skeleton className="h-3 w-24 bg-white/10" />
          <Skeleton className="mt-2 h-4 w-36 bg-white/10" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl bg-white/10" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <div className="flex gap-1.5">
              <Skeleton className="size-3 rounded-full bg-white/15" />
              <Skeleton className="size-3 rounded-full bg-white/15" />
              <Skeleton className="size-3 rounded-full bg-white/15" />
            </div>
            <Skeleton className="mx-auto h-7 w-full max-w-md rounded-lg bg-white/10" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/5 bg-white/10" />
                <Skeleton className="h-3 w-1/4 bg-white/10" />
              </div>
            </div>
            <Skeleton className="h-32 w-full rounded-xl bg-white/10" />
            <div className="grid flex-1 grid-cols-3 gap-3">
              <Skeleton className="rounded-xl bg-white/10" />
              <Skeleton className="rounded-xl bg-white/10" />
              <Skeleton className="rounded-xl bg-white/10" />
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Initializing desktop environment…
        </p>
      </div>
    </div>
  );
}

function ToolInspectorSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-50/80">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200/80 bg-white px-4 py-2.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="min-h-0 border-r border-zinc-200/80 bg-white p-2">
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>

        <div className="min-h-0 space-y-3 p-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function DesktopWorkspaceSkeleton() {
  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel defaultSize={64} minSize={38}>
        <DesktopPanelSkeleton />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={36} minSize={24}>
        <ToolInspectorSkeleton />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
