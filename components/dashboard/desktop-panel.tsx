"use client";

import { memo, useCallback } from "react";

import { DesktopVncFrame } from "@/components/dashboard/desktop-vnc-frame";
import {
  useEnsureDesktop,
  useSharedDesktopStream,
} from "@/components/dashboard/shared-desktop-provider";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type DesktopPanelProps = {
  title: string;
};

function PureDesktopPanel({ title }: DesktopPanelProps) {
  const { isInitializing } = useSharedDesktopStream();
  const ensureDesktop = useEnsureDesktop();
  const onCreateDesktop = useCallback(() => ensureDesktop(true), [ensureDesktop]);

  return (
    <div className="flex h-full flex-col bg-[var(--surface-elevated)] shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 text-zinc-900">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">
            Live desktop
          </p>
          <h3 className="mt-1 text-sm font-medium">{title}</h3>
        </div>
        <Button
          className="rounded-2xl border-[#d7e4ff] bg-[#edf4ff] text-[#2b4fb5] shadow-none hover:bg-[#e4eeff]"
          disabled={isInitializing}
          onClick={onCreateDesktop}
          variant="outline"
        >
          <RefreshCw className="size-4" />
          {isInitializing ? "Preparing..." : "New desktop"}
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#f8fbff]">
        <DesktopVncFrame />
      </div>
    </div>
  );
}

export const DesktopPanel = memo(
  PureDesktopPanel,
  (prev, next) => prev.title === next.title,
);
