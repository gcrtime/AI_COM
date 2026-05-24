"use client";

export function DesktopPlaceholder() {
  return (
    <div className="flex h-full flex-col bg-zinc-100">
      <div className="border-b border-zinc-200 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
          Desktop
        </p>
        <p className="mt-1 text-sm text-zinc-600">Sandbox 已暂时关闭（UI 调试模式）</p>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="h-full w-full rounded-2xl border border-dashed border-zinc-300 bg-white" />
      </div>
    </div>
  );
}
