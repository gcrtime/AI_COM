"use client";

import type { HTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  scrollableNodeProps?: HTMLAttributes<HTMLDivElement> & {
    ref?: Ref<HTMLDivElement>;
  };
};

export function ScrollArea({
  children,
  className,
  contentClassName,
  scrollableNodeProps,
}: ScrollAreaProps) {
  const { className: nodeClassName, ref, ...rest } = scrollableNodeProps ?? {};

  return (
    <div
      ref={ref}
      className={cn("custom-scroll min-h-0 flex-1 overflow-y-auto", className, nodeClassName)}
      {...rest}
    >
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
