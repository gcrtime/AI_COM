"use client";

import { memo } from "react";

import { useSharedDesktopStream } from "@/components/dashboard/shared-desktop-provider";

function PureDesktopVncFrame() {
  const { isInitializing, streamUrl } = useSharedDesktopStream();

  if (streamUrl) {
    return (
      <iframe
        allow="autoplay"
        className="h-full w-full"
        src={streamUrl}
        title="Live desktop stream"
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-sm text-zinc-300">
      {isInitializing ? "Initializing desktop..." : "No desktop stream"}
    </div>
  );
}

export const DesktopVncFrame = memo(PureDesktopVncFrame);
