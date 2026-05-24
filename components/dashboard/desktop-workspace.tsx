"use client";

import equal from "fast-deep-equal";
import { memo, useEffect, useState } from "react";

import { DesktopWorkspaceSkeleton } from "@/components/dashboard/desktop-workspace-skeleton";
import { DesktopPanel } from "@/components/dashboard/desktop-panel";
import { DesktopPlaceholder } from "@/components/dashboard/desktop-placeholder";
import { useSharedDesktopStream } from "@/components/dashboard/shared-desktop-provider";
import { ToolInspector } from "@/components/dashboard/tool-inspector";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { AgentEvent } from "@/lib/agent-events";
import { SANDBOX_UI_DISABLED } from "@/lib/feature-flags";

type DesktopWorkspaceProps = {
  agentStatus: string;
  sessionId: string;
  events: AgentEvent[];
  onSelectEvent: (eventId: string) => void;
  selectedEventId: string | null;
  title: string;
};

function PureDesktopWorkspace({
  agentStatus,
  sessionId,
  events,
  onSelectEvent,
  selectedEventId,
  title,
}: DesktopWorkspaceProps) {
  const { error, isInitializing, streamUrl } = useSharedDesktopStream();
  const [isSwitchingSession, setIsSwitchingSession] = useState(false);

  if (SANDBOX_UI_DISABLED) {
    return <DesktopPlaceholder />;
  }

  useEffect(() => {
    setIsSwitchingSession(true);
  }, [sessionId]);

  useEffect(() => {
    if (!isSwitchingSession) {
      return;
    }

    if (isInitializing && !streamUrl) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSwitchingSession(false);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [isInitializing, isSwitchingSession, streamUrl]);

  if (isInitializing && !streamUrl) {
    return <DesktopWorkspaceSkeleton />;
  }

  return (
    <div className="relative h-full min-h-0">
      {isSwitchingSession ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-end p-4">
          <div className="rounded-2xl border border-zinc-200 bg-white/92 px-3 py-2 shadow-sm backdrop-blur">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Switching
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900">
              Reconnecting desktop…
            </p>
          </div>
        </div>
      ) : null}

      <ResizablePanelGroup direction="vertical">
      <ResizablePanel defaultSize={64} minSize={38}>
        <DesktopPanel title={title} />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={36} minSize={24}>
        <ToolInspector
          agentStatus={
            error ? "desktop error" : isInitializing ? "desktop booting" : agentStatus
          }
          events={events}
          onSelectEvent={onSelectEvent}
          selectedEventId={selectedEventId}
        />
      </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export const DesktopWorkspace = memo(PureDesktopWorkspace, (prev, next) => {
  return (
    prev.sessionId === next.sessionId &&
    prev.title === next.title &&
    prev.selectedEventId === next.selectedEventId &&
    prev.agentStatus === next.agentStatus &&
    prev.onSelectEvent === next.onSelectEvent &&
    equal(prev.events, next.events)
  );
});
