import type { UIMessage } from "ai";

import {
  mapVisualStateToEventStatus,
  resolveToolInvocationVisualState,
} from "@/lib/tool-invocation-state";

export const SESSION_STORAGE_KEY = "ai-sdk-dashboard-sessions";
export const SESSION_STORAGE_VERSION = 2;

export type AgentEventStatus = "pending" | "complete" | "error";

export type ComputerEventType =
  | "screenshot"
  | "left_click"
  | "right_click"
  | "double_click"
  | "triple_click"
  | "mouse_move"
  | "type"
  | "key"
  | "wait"
  | "scroll"
  | "left_click_drag";

export type DesktopLifecycleEventType =
  | "desktop_boot"
  | "desktop_connect"
  | "desktop_reset"
  | "desktop_error";

export type KnownAgentEventType =
  | "bash"
  | "desktop_boot"
  | "desktop_connect"
  | "desktop_reset"
  | "desktop_error"
  | ComputerEventType;

type AgentEventBase = {
  id: string;
  sessionId: string;
  sourceMessageId: string;
  timestamp: number;
  status: AgentEventStatus;
  duration: number | null;
  result: unknown;
  label: string;
  detail: string;
  summary: string;
};

export type BashEventPayload = {
  command: string;
};

export type DesktopLifecycleEventPayload = {
  mode: "boot" | "connect" | "reset" | "error";
  sandboxId?: string;
  previousSandboxId?: string;
  reason?: string;
};

export type ScreenshotEventPayload = {
  action: "screenshot";
};

export type CoordinateEventPayload = {
  action: Exclude<
    ComputerEventType,
    "screenshot" | "type" | "key" | "wait" | "scroll"
  >;
  coordinate?: [number, number];
  start_coordinate?: [number, number];
};

export type TextEventPayload = {
  action: "type" | "key";
  text?: string;
};

export type WaitEventPayload = {
  action: "wait";
  duration?: number;
};

export type ScrollEventPayload = {
  action: "scroll";
  scroll_amount?: number;
  scroll_direction?: string;
};

export type BashAgentEvent = AgentEventBase & {
  type: "bash";
  payload: BashEventPayload;
};

export type DesktopLifecycleAgentEvent = AgentEventBase & {
  type: DesktopLifecycleEventType;
  payload: DesktopLifecycleEventPayload;
};

export type ScreenshotAgentEvent = AgentEventBase & {
  type: "screenshot";
  payload: ScreenshotEventPayload;
};

export type CoordinateAgentEvent = AgentEventBase & {
  type: CoordinateEventPayload["action"];
  payload: CoordinateEventPayload;
};

export type TextAgentEvent = AgentEventBase & {
  type: TextEventPayload["action"];
  payload: TextEventPayload;
};

export type WaitAgentEvent = AgentEventBase & {
  type: "wait";
  payload: WaitEventPayload;
};

export type ScrollAgentEvent = AgentEventBase & {
  type: "scroll";
  payload: ScrollEventPayload;
};

export type ComputerAgentEvent =
  | ScreenshotAgentEvent
  | CoordinateAgentEvent
  | TextAgentEvent
  | WaitAgentEvent
  | ScrollAgentEvent;

export type GenericComputerAgentEvent = AgentEventBase & {
  type: string;
  payload: Record<string, unknown> & { action: string };
};

export type AgentEvent =
  | BashAgentEvent
  | DesktopLifecycleAgentEvent
  | ComputerAgentEvent
  | GenericComputerAgentEvent;

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  sandboxId: string | null;
  messages: UIMessage[];
  events: AgentEvent[];
  selectedEventId: string | null;
};

export type PersistedSessionState = {
  version: number;
  activeSessionId: string;
  sessions: ChatSession[];
};

type ToolInvocationMeta = {
  type: KnownAgentEventType | string;
  label: string;
  detail: string;
  summary: string;
};

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumberTuple(value: unknown): [number, number] | null {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [value[0], value[1]];
  }

  return null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function summarize(label: string, detail: string): string {
  return detail ? `${label} ${detail}` : label;
}

export function isKnownAgentEventType(value: string): value is KnownAgentEventType {
  return (
    value === "bash" ||
    value === "desktop_boot" ||
    value === "desktop_connect" ||
    value === "desktop_reset" ||
    value === "desktop_error" ||
    value === "screenshot" ||
    value === "left_click" ||
    value === "right_click" ||
    value === "double_click" ||
    value === "triple_click" ||
    value === "mouse_move" ||
    value === "type" ||
    value === "key" ||
    value === "wait" ||
    value === "scroll" ||
    value === "left_click_drag"
  );
}

export function isBashEvent(event: AgentEvent): event is BashAgentEvent {
  return event.type === "bash";
}

export function isScreenshotEvent(event: AgentEvent): event is ScreenshotAgentEvent {
  return event.type === "screenshot";
}

export function isDesktopLifecycleEvent(
  event: AgentEvent,
): event is DesktopLifecycleAgentEvent {
  return (
    event.type === "desktop_boot" ||
    event.type === "desktop_connect" ||
    event.type === "desktop_reset" ||
    event.type === "desktop_error"
  );
}

function buildEventPayload(
  type: KnownAgentEventType | string,
  rawArgs: unknown,
): Record<string, unknown> {
  const args = readRecord(rawArgs);

  if (type === "bash") {
    return {
      command: readString(args.command) ?? "",
    };
  }

  if (
    type === "desktop_boot" ||
    type === "desktop_connect" ||
    type === "desktop_reset" ||
    type === "desktop_error"
  ) {
    return {
      mode:
        readString(args.mode) ??
        (type === "desktop_boot"
          ? "boot"
          : type === "desktop_connect"
            ? "connect"
            : type === "desktop_reset"
              ? "reset"
              : "error"),
      previousSandboxId: readString(args.previousSandboxId) ?? undefined,
      reason: readString(args.reason) ?? undefined,
      sandboxId: readString(args.sandboxId) ?? undefined,
    };
  }

  if (type === "screenshot") {
    return { action: "screenshot" };
  }

  if (type === "type" || type === "key") {
    return {
      action: type,
      text: readString(args.text) ?? undefined,
    };
  }

  if (type === "wait") {
    return {
      action: "wait",
      duration: readNumber(args.duration) ?? undefined,
    };
  }

  if (type === "scroll") {
    return {
      action: "scroll",
      scroll_amount: readNumber(args.scroll_amount) ?? undefined,
      scroll_direction: readString(args.scroll_direction) ?? undefined,
    };
  }

  return {
    action: type as CoordinateEventPayload["action"],
    coordinate: readNumberTuple(args.coordinate) ?? undefined,
    start_coordinate: readNumberTuple(args.start_coordinate) ?? undefined,
  };
}

export function getToolInvocationMeta(
  toolName: string,
  rawArgs: unknown,
): ToolInvocationMeta {
  const args = readRecord(rawArgs);

  if (toolName === "bash") {
    const command = readString(args.command) ?? "";

    return {
      type: "bash",
      label: "Running command",
      detail: command.slice(0, 80),
      summary: summarize("Running command", command.slice(0, 80)),
    };
  }

  const action = readString(args.action) ?? "screenshot";
  const coordinate = readNumberTuple(args.coordinate);
  const text = readString(args.text);
  const duration = readNumber(args.duration);
  const scrollAmount = readNumber(args.scroll_amount);
  const scrollDirection = readString(args.scroll_direction);

  switch (action) {
    case "screenshot":
      return {
        type: "screenshot",
        label: "Taking screenshot",
        detail: "",
        summary: "Taking screenshot",
      };
    case "left_click":
      return {
        type: "left_click",
        label: "Left clicking",
        detail: coordinate ? `at (${coordinate[0]}, ${coordinate[1]})` : "",
        summary: summarize(
          "Left clicking",
          coordinate ? `at (${coordinate[0]}, ${coordinate[1]})` : "",
        ),
      };
    case "right_click":
      return {
        type: "right_click",
        label: "Right clicking",
        detail: coordinate ? `at (${coordinate[0]}, ${coordinate[1]})` : "",
        summary: summarize(
          "Right clicking",
          coordinate ? `at (${coordinate[0]}, ${coordinate[1]})` : "",
        ),
      };
    case "double_click":
      return {
        type: "double_click",
        label: "Double clicking",
        detail: coordinate ? `at (${coordinate[0]}, ${coordinate[1]})` : "",
        summary: summarize(
          "Double clicking",
          coordinate ? `at (${coordinate[0]}, ${coordinate[1]})` : "",
        ),
      };
    case "triple_click":
      return {
        type: "triple_click",
        label: "Triple clicking",
        detail: coordinate ? `at (${coordinate[0]}, ${coordinate[1]})` : "",
        summary: summarize(
          "Triple clicking",
          coordinate ? `at (${coordinate[0]}, ${coordinate[1]})` : "",
        ),
      };
    case "mouse_move":
      return {
        type: "mouse_move",
        label: "Moving mouse",
        detail: coordinate ? `to (${coordinate[0]}, ${coordinate[1]})` : "",
        summary: summarize(
          "Moving mouse",
          coordinate ? `to (${coordinate[0]}, ${coordinate[1]})` : "",
        ),
      };
    case "type":
      return {
        type: "type",
        label: "Typing",
        detail: text ? `"${text}"` : "",
        summary: summarize("Typing", text ? `"${text}"` : ""),
      };
    case "key":
      return {
        type: "key",
        label: "Pressing key",
        detail: text ? `"${text}"` : "",
        summary: summarize("Pressing key", text ? `"${text}"` : ""),
      };
    case "wait":
      return {
        type: "wait",
        label: "Waiting",
        detail: duration ? `${duration} seconds` : "",
        summary: summarize("Waiting", duration ? `${duration} seconds` : ""),
      };
    case "scroll":
      return {
        type: "scroll",
        label: "Scrolling",
        detail:
          scrollDirection && scrollAmount
            ? `${scrollDirection} by ${scrollAmount}`
            : "",
        summary: summarize(
          "Scrolling",
          scrollDirection && scrollAmount
            ? `${scrollDirection} by ${scrollAmount}`
            : "",
        ),
      };
    case "left_click_drag":
      return {
        type: "left_click_drag",
        label: "Dragging",
        detail: coordinate ? `toward (${coordinate[0]}, ${coordinate[1]})` : "",
        summary: summarize(
          "Dragging",
          coordinate ? `toward (${coordinate[0]}, ${coordinate[1]})` : "",
        ),
      };
    default:
      return {
        type: action,
        label: action,
        detail: "",
        summary: action,
      };
  }
}

type CreateAgentEventInput = {
  id: string;
  sessionId: string;
  sourceMessageId: string;
  type: string;
  timestamp: number;
  status: AgentEventStatus;
  duration: number | null;
  result: unknown;
  label: string;
  detail: string;
  summary: string;
  payload: Record<string, unknown>;
};

function createAgentEvent(input: CreateAgentEventInput): AgentEvent {
  const { type, payload, ...rest } = input;

  if (type === "bash") {
    return {
      ...rest,
      type: "bash",
      payload: {
        command: readString(payload.command) ?? "",
      },
    };
  }

  if (
    type === "desktop_boot" ||
    type === "desktop_connect" ||
    type === "desktop_reset" ||
    type === "desktop_error"
  ) {
    return {
      ...rest,
      type,
      payload: {
        mode:
          readString(payload.mode) ??
          (type === "desktop_boot"
            ? "boot"
            : type === "desktop_connect"
              ? "connect"
              : type === "desktop_reset"
                ? "reset"
                : "error"),
        sandboxId: readString(payload.sandboxId) ?? undefined,
        previousSandboxId: readString(payload.previousSandboxId) ?? undefined,
        reason: readString(payload.reason) ?? undefined,
      },
    } as DesktopLifecycleAgentEvent;
  }

  if (type === "screenshot") {
    return {
      ...rest,
      type: "screenshot",
      payload: { action: "screenshot" },
    };
  }

  if (type === "type" || type === "key") {
    return {
      ...rest,
      type,
      payload: {
        action: type,
        text: readString(payload.text) ?? undefined,
      },
    };
  }

  if (type === "wait") {
    return {
      ...rest,
      type: "wait",
      payload: {
        action: "wait",
        duration: readNumber(payload.duration) ?? undefined,
      },
    };
  }

  if (type === "scroll") {
    return {
      ...rest,
      type: "scroll",
      payload: {
        action: "scroll",
        scroll_amount: readNumber(payload.scroll_amount) ?? undefined,
        scroll_direction: readString(payload.scroll_direction) ?? undefined,
      },
    };
  }

  if (isKnownAgentEventType(type) && type !== "bash" && type !== "screenshot") {
    return {
      ...rest,
      type,
      payload: {
        action: type,
        coordinate: readNumberTuple(payload.coordinate) ?? undefined,
        start_coordinate: readNumberTuple(payload.start_coordinate) ?? undefined,
      },
    } as ComputerAgentEvent;
  }

  return {
    ...rest,
    type,
    payload: {
      action: type,
      ...payload,
    },
  };
}

export function migrateAgentEventStatus(status: unknown): AgentEventStatus {
  if (status === "pending" || status === "complete" || status === "error") {
    return status;
  }

  if (status === "running") {
    return "pending";
  }

  if (status === "error") {
    return "error";
  }

  if (status === "completed" || status === "aborted") {
    return "complete";
  }

  return "complete";
}

export function normalizeAgentEvent(raw: unknown): AgentEvent | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = readString(record.id);
  const sessionId = readString(record.sessionId);
  const sourceMessageId = readString(record.sourceMessageId);

  if (!id || !sessionId || !sourceMessageId) {
    return null;
  }

  const legacyType = readString(record.actionType);
  const nextType = readString(record.type) ?? legacyType ?? "screenshot";
  const legacyTimestamp = readNumber(record.startedAt);
  const timestamp = readNumber(record.timestamp) ?? legacyTimestamp ?? Date.now();
  const legacyDuration = readNumber(record.durationMs);
  const duration =
    readNumber(record.duration) ??
    legacyDuration ??
    (migrateAgentEventStatus(record.status) === "pending" ? null : 0);

  const payload = readRecord(record.payload);
  if (Object.keys(payload).length === 0 && legacyType) {
    payload.action = legacyType;
  }

  return createAgentEvent({
    id,
    sessionId,
    sourceMessageId,
    type: nextType,
    timestamp,
    status: migrateAgentEventStatus(record.status),
    duration,
    result: record.result ?? null,
    label: readString(record.label) ?? nextType,
    detail: readString(record.detail) ?? "",
    summary: readString(record.summary) ?? nextType,
    payload,
  });
}

export function migratePersistedSessionState(
  state: PersistedSessionState,
): PersistedSessionState {
  return {
    ...state,
    version: SESSION_STORAGE_VERSION,
    sessions: state.sessions.map((session) => ({
      ...session,
      events: session.events
        .map((event) => normalizeAgentEvent(event))
        .filter((event): event is AgentEvent => event !== null),
    })),
  };
}

export function buildAgentEvents(
  sessionId: string,
  messages: UIMessage[],
  previousEvents: AgentEvent[],
): AgentEvent[] {
  const desktopEvents = previousEvents.filter(isDesktopLifecycleEvent);
  const previousById = new Map(previousEvents.map((event) => [event.id, event]));
  const nextEvents: AgentEvent[] = [];

  for (const message of messages) {
    const parts = message.parts ?? [];

    for (const part of parts) {
      if (part.type !== "tool-invocation") {
        continue;
      }

      const toolCallId = part.toolInvocation.toolCallId;
      const existingEvent = previousById.get(toolCallId);
      const meta = getToolInvocationMeta(
        part.toolInvocation.toolName,
        part.toolInvocation.args,
      );
      const result =
        part.toolInvocation.state === "result"
          ? part.toolInvocation.result ?? null
          : null;
      const isResolved = part.toolInvocation.state === "result";
      const visualState = resolveToolInvocationVisualState(
        part.toolInvocation.state,
        result,
      );
      const nextStatus = mapVisualStateToEventStatus(visualState);
      const timestamp = existingEvent?.timestamp ?? Date.now();
      const duration =
        nextStatus === "pending"
          ? null
          : existingEvent?.duration ??
            Math.max(0, Date.now() - timestamp);

      nextEvents.push(
        createAgentEvent({
          id: toolCallId,
          sessionId,
          sourceMessageId: message.id,
          type: meta.type,
          timestamp,
          status: nextStatus,
          duration,
          label: meta.label,
          detail: meta.detail,
          summary: meta.summary,
          payload: buildEventPayload(meta.type, part.toolInvocation.args),
          result: isResolved ? result : existingEvent?.result ?? null,
        }),
      );
    }
  }

  return [...desktopEvents, ...nextEvents].sort(
    (left, right) => left.timestamp - right.timestamp,
  );
}

export function createDesktopLifecycleEvent(input: {
  sessionId: string;
  type: DesktopLifecycleEventType;
  sandboxId?: string;
  previousSandboxId?: string;
  reason?: string;
  status?: AgentEventStatus;
}) {
  const { previousSandboxId, reason, sandboxId, sessionId, type } = input;
  const timestamp = Date.now();

  return createAgentEvent({
    id: crypto.randomUUID(),
    sessionId,
    sourceMessageId: `desktop:${type}:${timestamp}`,
    type,
    timestamp,
    status: input.status ?? (type === "desktop_error" ? "error" : "complete"),
    duration: 0,
    result:
      type === "desktop_error"
        ? { type: "text", text: reason ?? "Desktop action failed" }
        : {
            type: "text",
            text:
              type === "desktop_boot"
                ? "Desktop created"
                : type === "desktop_connect"
                  ? "Desktop connected"
                  : "Desktop reset",
          },
    label:
      type === "desktop_boot"
        ? "Booting desktop"
        : type === "desktop_connect"
          ? "Connecting desktop"
          : type === "desktop_reset"
            ? "Resetting desktop"
            : "Desktop error",
    detail:
      type === "desktop_error"
        ? reason ?? ""
        : sandboxId
          ? `sandbox ${sandboxId.slice(0, 12)}`
          : "",
    summary:
      type === "desktop_error"
        ? `Desktop error ${reason ?? ""}`.trim()
        : type === "desktop_boot"
          ? "Desktop created"
          : type === "desktop_connect"
            ? "Desktop connected"
            : "Desktop reset",
    payload: {
      mode:
        type === "desktop_boot"
          ? "boot"
          : type === "desktop_connect"
            ? "connect"
            : type === "desktop_reset"
              ? "reset"
              : "error",
      sandboxId,
      previousSandboxId,
      reason,
    },
  });
}

export function deriveSessionTitle(
  messages: UIMessage[],
  fallbackTitle: string,
): string {
  for (const message of messages) {
    const text = readUserMessageText(message);
    if (text) {
      return text.slice(0, 40);
    }
  }

  return fallbackTitle;
}

export function deriveLatestUserPrompt(
  messages: UIMessage[],
  fallbackTitle: string,
): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = readUserMessageText(messages[index]);
    if (text) {
      return text.slice(0, 40);
    }
  }

  return fallbackTitle;
}

function readUserMessageText(message: UIMessage): string | null {
  if (message.role !== "user") {
    return null;
  }

  const content = readString(message.content);
  if (content?.trim()) {
    return content.trim();
  }

  const textPart = message.parts?.find((part) => part.type === "text");
  if (textPart?.text.trim()) {
    return textPart.text.trim();
  }

  return null;
}

export function sanitizeMessagesForStorage(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: (message.parts ?? []).map((part) => {
      if (part.type !== "tool-invocation") {
        return part;
      }

      if (part.toolInvocation.state !== "result") {
        return part;
      }

      const result = part.toolInvocation.result;
      if (
        result &&
        typeof result === "object" &&
        "type" in result &&
        result.type === "image"
      ) {
        return {
          ...part,
          toolInvocation: {
            ...part.toolInvocation,
            result: {
              type: "text",
              text: "Screenshot omitted from local storage",
            },
          },
        };
      }

      return part;
    }),
  }));
}

export function isSessionListed(session: ChatSession): boolean {
  return session.messages.length > 0;
}

export function getListedSessions(sessions: ChatSession[]): ChatSession[] {
  return sessions.filter(isSessionListed);
}

export function pruneEmptySessions(
  sessions: ChatSession[],
  keepSessionIds: string[] = [],
): ChatSession[] {
  const keep = new Set(keepSessionIds);

  return sessions.filter(
    (session) => isSessionListed(session) || keep.has(session.id),
  );
}

export function createSession(index: number): ChatSession {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    title: `New chat ${index}`,
    createdAt: now,
    updatedAt: now,
    sandboxId: null,
    messages: [],
    events: [],
    selectedEventId: null,
  };
}
