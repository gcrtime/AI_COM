"use client";

import { DesktopPanel } from "@/components/dashboard/desktop-panel";
import { useSharedDesktopStream } from "@/components/dashboard/shared-desktop-provider";
import { SANDBOX_UI_DISABLED } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type MobileDesktopPanelProps = {
  sessionId: string;
  title: string;
  visible: boolean;
};

export function MobileDesktopPanel({
  sessionId,
  title,
  visible,
}: MobileDesktopPanelProps) {
  const { isInitializing } = useSharedDesktopStream();
  const [isSwitchingSession, setIsSwitchingSession] = useState(false);

  useEffect(() => {
    setIsSwitchingSession(true);
  }, [sessionId]);

  useEffect(() => {
    if (!isSwitchingSession) {
      return;
    }

    if (isInitializing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSwitchingSession(false);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [isInitializing, isSwitchingSession]);

  if (SANDBOX_UI_DISABLED || !visible) {
    return null;
  }

  return (
    <section
      className={cn(
        "flex shrink-0 flex-col border-t border-zinc-200 bg-white transition-[height] duration-300",
        "h-[38dvh]",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {isSwitchingSession ? (
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Switching
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900">
              Reconnecting desktop…
            </p>
          </div>
        ) : null}
        <DesktopPanel title={title} />
      </div>
    </section>
  );
}
