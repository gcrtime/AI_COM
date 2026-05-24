"use client";

import type { Message } from "ai";
import { memo } from "react";
import equal from "fast-deep-equal";
import { Streamdown } from "streamdown";

import {
  getToolCardClassName,
  ToolDurationLabel,
  ToolIconShell,
  ToolStatusBadge,
  ToolStatusIcon,
} from "@/components/tool-invocation-status";
import { getToolInvocationMeta } from "@/lib/agent-events";
import { getMessageParts } from "@/lib/message-parts";
import {
  getToolErrorMessage,
  resolveToolInvocationVisualState,
} from "@/lib/tool-invocation-state";
import { cn } from "@/lib/utils";
import {
  Camera,
  Clock,
  Keyboard,
  KeyRound,
  MousePointer,
  MousePointerClick,
  ScrollText,
  TerminalSquare,
} from "lucide-react";

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  onToolSelect,
  selectedToolCallId,
  status,
  toolDurationById = {},
}: {
  message: Message;
  isLoading: boolean;
  onToolSelect?: (toolCallId: string) => void;
  selectedToolCallId?: string | null;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  toolDurationById?: Record<string, number | null>;
}) => {
  const parts = getMessageParts(message);
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "group/message flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
      data-role={message.role}
    >
      <div
        className={cn(
          "flex w-full max-w-[85%] gap-3",
          isUser ? "flex-row-reverse" : "flex-row",
        )}
      >
        <div className="flex min-w-0 flex-col gap-2">
          {parts.map((part, i) => {
            switch (part.type) {
              case "text":
                return (
                  <div
                    key={`message-${message.id}-part-${i}`}
                    className="flex w-full flex-row items-start"
                  >
                    <div
                      className={cn("flex flex-col gap-2 text-sm leading-6", {
                        "rounded-2xl bg-[#edf3ff] px-4 py-2.5 text-[#24459a] shadow-[var(--shadow-soft)]":
                          isUser,
                        "rounded-2xl border border-zinc-100 bg-white px-4 py-2.5 text-zinc-900 shadow-[var(--shadow-soft)]":
                          !isUser,
                      })}
                    >
                      <Streamdown>{part.text}</Streamdown>
                    </div>
                  </div>
                );
              case "tool-invocation": {
                const { toolName, toolCallId, state, args } =
                  part.toolInvocation;
                const result =
                  state === "result" ? part.toolInvocation.result : null;
                const visualState = resolveToolInvocationVisualState(
                  state,
                  result,
                );
                const errorMessage = getToolErrorMessage(result);
                const isSelected = selectedToolCallId === toolCallId;
                const showSpinner =
                  visualState === "pending" &&
                  isLatestMessage &&
                  status !== "ready";

                if (toolName === "computer") {
                  const { type, detail, label } = getToolInvocationMeta(
                    toolName,
                    args,
                  );
                  const action = type;
                  let ActionIcon = MousePointer;

                  switch (action) {
                    case "screenshot":
                      ActionIcon = Camera;
                      break;
                    case "left_click":
                    case "mouse_move":
                      ActionIcon = MousePointer;
                      break;
                    case "right_click":
                    case "double_click":
                    case "triple_click":
                      ActionIcon = MousePointerClick;
                      break;
                    case "type":
                      ActionIcon = Keyboard;
                      break;
                    case "key":
                      ActionIcon = KeyRound;
                      break;
                    case "wait":
                      ActionIcon = Clock;
                      break;
                    case "scroll":
                      ActionIcon = ScrollText;
                      break;
                    default:
                      ActionIcon = MousePointer;
                      break;
                  }

                  return (
                    <button
                      type="button"
                      onClick={() => onToolSelect?.(toolCallId)}
                      key={`message-${message.id}-part-${i}`}
                      className={cn(
                        getToolCardClassName(visualState, isSelected),
                        "flex-col gap-2",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <ToolIconShell visualState={visualState}>
                          <ActionIcon className="h-4 w-4" />
                        </ToolIconShell>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 font-mono font-medium">
                            <span>{label}</span>
                            <ToolStatusBadge visualState={visualState} />
                            <ToolDurationLabel
                              durationMs={toolDurationById[toolCallId]}
                              visualState={visualState}
                            />
                          </div>
                          {detail ? (
                            <p className="mt-0.5 truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                              {detail}
                            </p>
                          ) : null}
                        </div>
                        <ToolStatusIcon
                          showSpinner={showSpinner}
                          visualState={visualState}
                        />
                      </div>
                      {visualState === "error" && errorMessage ? (
                        <p className="rounded-md bg-red-100/80 px-2 py-1.5 text-xs leading-relaxed text-red-700">
                          {errorMessage}
                        </p>
                      ) : null}
                      {visualState === "complete" &&
                      result &&
                      typeof result === "object" &&
                      "type" in result &&
                      result.type === "image" ? (
                        <div className="p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:image/png;base64,${result.data}`}
                            alt="Generated Image"
                            className="aspect-[1024/768] w-full rounded-sm"
                          />
                        </div>
                      ) : visualState === "pending" && action === "screenshot" ? (
                        <div className="aspect-[1024/768] w-full animate-pulse rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                      ) : null}
                    </button>
                  );
                }

                if (toolName === "bash") {
                  const { detail } = getToolInvocationMeta(toolName, args);
                  const output =
                    visualState === "complete" &&
                    typeof result === "string" &&
                    !errorMessage
                      ? result
                      : null;

                  return (
                    <button
                      type="button"
                      onClick={() => onToolSelect?.(toolCallId)}
                      key={`message-${message.id}-part-${i}`}
                      className={cn(
                        getToolCardClassName(visualState, isSelected),
                        "flex-col gap-2",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <ToolIconShell visualState={visualState}>
                          <TerminalSquare className="h-4 w-4" />
                        </ToolIconShell>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 font-medium">
                            <span>Running command</span>
                            <ToolStatusBadge visualState={visualState} />
                            <ToolDurationLabel
                              durationMs={toolDurationById[toolCallId]}
                              visualState={visualState}
                            />
                          </div>
                          <p className="mt-0.5 truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                            {detail}
                          </p>
                        </div>
                        <ToolStatusIcon
                          showSpinner={showSpinner}
                          visualState={visualState}
                        />
                      </div>
                      {visualState === "error" && errorMessage ? (
                        <p className="rounded-md bg-red-100/80 px-2 py-1.5 text-xs leading-relaxed text-red-700">
                          {errorMessage}
                        </p>
                      ) : null}
                      {output ? (
                        <pre className="max-h-28 overflow-auto rounded-md bg-zinc-950/5 px-2 py-1.5 font-mono text-xs leading-relaxed text-zinc-700">
                          {output}
                        </pre>
                      ) : null}
                    </button>
                  );
                }

                return (
                  <div key={toolCallId}>
                    <h3>
                      {toolName}: {state}
                    </h3>
                    <pre>{JSON.stringify(args, null, 2)}</pre>
                  </div>
                );
              }
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.status !== nextProps.status) return false;
    if (prevProps.message.annotations !== nextProps.message.annotations)
      return false;
    if (prevProps.selectedToolCallId !== nextProps.selectedToolCallId)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (prevProps.message.content !== nextProps.message.content) return false;
    if (prevProps.isLatestMessage !== nextProps.isLatestMessage) return false;
    if (!equal(prevProps.toolDurationById, nextProps.toolDurationById)) return false;

    return true;
  },
);
