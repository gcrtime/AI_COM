"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ChatPanelSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-6 py-5">
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="flex-1 space-y-4 px-6 py-6">
        <div className="flex justify-end">
          <Skeleton className="h-16 w-[55%] rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-24 w-[70%] rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-14 w-[45%] rounded-2xl" />
        </div>
      </div>

      <div className="p-4">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
