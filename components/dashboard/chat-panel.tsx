"use client";

import type { UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DebugPanel } from "@/components/dashboard/debug-panel";
import { ThinkingIndicator } from "@/components/dashboard/thinking-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/input";
import { DEFAULT_CHAT_ERROR_MESSAGE, getChatErrorMessage } from "@/lib/chat-errors";
import { getMessageParts } from "@/lib/message-parts";
import { PreviewMessage } from "@/components/message";
import { PromptSuggestions } from "@/components/prompt-suggestions";
import { ChatHeader } from "@/components/dashboard/chat-header";
import { ProjectInfo } from "@/components/project-info";
import {
  buildAgentEvents,
  deriveSessionTitle,
  type AgentEvent,
  type ChatSession,
} from "@/lib/agent-events";
import type {
  DebugAgentStatus,
  ProductAgentStatus,
  ChatRuntimeStatus,
} from "@/lib/agent-status";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import { ABORTED } from "@/lib/utils";

type ChatPanelProps = {
  session: ChatSession;
  agentStatus: ProductAgentStatus;
  debugAgentStatus: DebugAgentStatus;
  sandboxId: string | null;
  isDebugOpen: boolean;
  isSidebarCollapsed?: boolean;
  isMobile?: boolean;
  onExpandSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
  onCreateSession?: () => void;
  onChatStatusChange: (sessionId: string, status: ChatRuntimeStatus) => void;
  onToggleDebug: () => void;
  onPersist: (
    sessionId: string,
    payload: {
      messages: UIMessage[];
      events: AgentEvent[];
      title: string;
    },
  ) => void;
  onSelectEvent: (eventId: string) => void;
};

export function ChatPanel({
  session,
  agentStatus,
  debugAgentStatus,
  sandboxId,
  isDebugOpen,
  isSidebarCollapsed = false,
  isMobile = false,
  onExpandSidebar,
  onOpenMobileSidebar,
  onCreateSession,
  onChatStatusChange,
  onToggleDebug,
  onPersist,
  onSelectEvent,
}: ChatPanelProps) {
  const [containerRef, endRef] = useScrollToBottom();
  const lastPersistedRef = useRef<string | null>(null);
  const [requestFailed, setRequestFailed] = useState(false);
  const lastErrorMessageRef = useRef<string | null>(null);

  const {
    append,
    error: chatError,
    handleInputChange,
    handleSubmit,
    input,
    messages,
    setMessages,
    status,
    stop: stopGeneration,
  } = useChat({
    api: "/api/chat",
    body: {
      sandboxId: sandboxId ?? "",
    },
    id: session.id,
    initialMessages: session.messages,
    maxSteps: 30,
    onError: (error) => {
      setRequestFailed(true);
      const message = getChatErrorMessage(error) || DEFAULT_CHAT_ERROR_MESSAGE;
      if (lastErrorMessageRef.current !== message) {
        appendAssistantErrorMessage(message);
        lastErrorMessageRef.current = message;
      }
      console.error(error);
      toast.error("The agent hit an error", {
        description: message,
        position: "top-center",
        richColors: true,
      });
    },
  });

  const appendAssistantErrorMessage = useCallback(
    (messageText: string) => {
      setMessages((currentMessages) => {
        const lastMessage = currentMessages.at(-1);
        const fallbackMessage: UIMessage = {
          content: messageText,
          id: `chat-error-${Date.now()}`,
          parts: [{ text: messageText, type: "text" }],
          role: "assistant",
        };

        if (!lastMessage) {
          return [...currentMessages, fallbackMessage];
        }

        const lastParts = getMessageParts(lastMessage);
        const lastVisibleText =
          lastParts.length === 1 && lastParts[0]?.type === "text"
            ? lastParts[0].text.trim()
            : "";

        if (lastVisibleText === messageText) {
          return currentMessages;
        }

        if (lastMessage.role === "assistant" && lastParts.length === 0) {
          return [
            ...currentMessages.slice(0, -1),
            {
              ...fallbackMessage,
              id: lastMessage.id,
            },
          ];
        }

        return [...currentMessages, fallbackMessage];
      });
    },
    [setMessages],
  );

  const isStreaming = status === "submitted" || status === "streaming";
  const isLoading = isStreaming && !chatError && !requestFailed;
  const isDesktopPreparing = !sandboxId;

  useEffect(() => {
    if (isStreaming) {
      setRequestFailed(false);
      lastErrorMessageRef.current = null;
    }
  }, [isStreaming]);

  useEffect(() => {
    onChatStatusChange(session.id, chatError || requestFailed ? "error" : status);
  }, [chatError, onChatStatusChange, requestFailed, session.id, status]);

  const selectedEvent =
    session.events.find((event) => event.id === session.selectedEventId) ??
    session.events.at(-1) ??
    null;

  const eventCounts = useMemo(() => {
    return session.events.reduce<Record<string, number>>((counts, event) => {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
      return counts;
    }, {});
  }, [session.events]);

  const persistCurrentSession = useCallback(
    (nextMessages: UIMessage[]) => {
      const nextEvents = buildAgentEvents(
        session.id,
        nextMessages,
        session.events,
      );
      const nextTitle = deriveSessionTitle(nextMessages, session.title);
      const fingerprint = JSON.stringify({
        messages: nextMessages,
        events: nextEvents,
        title: nextTitle,
      });

      if (lastPersistedRef.current === fingerprint) {
        return;
      }

      lastPersistedRef.current = fingerprint;
      onPersist(session.id, {
        messages: nextMessages,
        events: nextEvents,
        title: nextTitle,
      });
    },
    [onPersist, session.events, session.id, session.title],
  );

  const skipInitialPersistRef = useRef(true);

  useEffect(() => {
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      lastPersistedRef.current = JSON.stringify({
        events: session.events,
        messages: session.messages,
        title: session.title,
      });
      return;
    }

    persistCurrentSession(messages);
  }, [messages, persistCurrentSession, session.events, session.messages, session.title]);

  useEffect(() => {
    return () => {
      const nextEvents = buildAgentEvents(
        session.id,
        messages,
        session.events,
      );
      const nextTitle = deriveSessionTitle(messages, session.title);
      const fingerprint = JSON.stringify({
        events: nextEvents,
        messages,
        title: nextTitle,
      });

      if (lastPersistedRef.current === fingerprint) {
        return;
      }

      persistCurrentSession(messages);
    };
  }, [messages, persistCurrentSession, session.events, session.id, session.title]);

  const stop = useCallback(() => {
    stopGeneration();

    const lastMessage = messages.at(-1);
    const lastPart = lastMessage?.parts?.at(-1);
    if (
      lastMessage?.role === "assistant" &&
      lastPart?.type === "tool-invocation"
    ) {
      setMessages((currentMessages) => [
        ...currentMessages.slice(0, -1),
        {
          ...lastMessage,
          parts: [
            ...(lastMessage.parts ?? []).slice(0, -1),
            {
              ...lastPart,
              toolInvocation: {
                ...lastPart.toolInvocation,
                result: ABORTED,
                state: "result",
              },
            },
          ],
        },
      ]);
    }
  }, [messages, setMessages, stopGeneration]);

  const showThinking = useMemo(() => {
    if (!isStreaming || chatError || requestFailed) {
      return false;
    }

    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role === "user") {
      return true;
    }

    const parts = getMessageParts(lastMessage);
    const hasTextContent = parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0,
    );

    return !hasTextContent;
  }, [chatError, isStreaming, messages, requestFailed]);

  const toolDurationById = useMemo(() => {
    const events = buildAgentEvents(session.id, messages, session.events);

    return Object.fromEntries(
      events.map((event) => [event.id, event.duration]),
    ) as Record<string, number | null>;
  }, [messages, session.events, session.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        agentStatus={agentStatus}
        isMobile={isMobile}
        isSidebarCollapsed={isSidebarCollapsed}
        onCreateSession={onCreateSession}
        onExpandSidebar={onExpandSidebar}
        onOpenMobileSidebar={onOpenMobileSidebar}
        title={session.title}
      />

      <ScrollArea
        contentClassName="px-6 py-6"
        scrollableNodeProps={{ ref: containerRef }}
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center py-8">
            <ProjectInfo />
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-none flex-col gap-4">
            {messages.map((message, index) => (
              <PreviewMessage
                isLoading={isLoading}
                isLatestMessage={index === messages.length - 1}
                key={message.id}
                message={message}
                onToolSelect={onSelectEvent}
                selectedToolCallId={selectedEvent?.id ?? null}
                status={status}
                toolDurationById={toolDurationById}
              />
            ))}
            {showThinking ? <ThinkingIndicator /> : null}
          </div>
        )}
        <div ref={endRef} />
      </ScrollArea>

      <footer className="shrink-0 border-t border-zinc-100/80 bg-transparent">
        {isDesktopPreparing ? (
          <div className="border-b border-zinc-100/80 bg-zinc-50/90 px-6 py-2.5 text-xs text-zinc-500">
            Desktop is preparing for this session. Wait for the VM to be ready
            before sending a task.
          </div>
        ) : null}

        {messages.length === 0 && !isMobile ? (
          <div className="px-6 pt-4">
            <PromptSuggestions
              disabled={isDesktopPreparing}
              submitPrompt={(prompt) => {
                if (isDesktopPreparing) {
                  return;
                }

                append({ content: prompt, role: "user" });
              }}
            />
          </div>
        ) : null}

        {!isMobile ? (
          <DebugPanel
            eventCounts={eventCounts}
            events={session.events}
            isOpen={isDebugOpen}
            onToggle={onToggleDebug}
            statusSummary={{
              debugAgentStatus,
              productAgentStatus: agentStatus,
              chatStatus: status,
              desktopReady: Boolean(sandboxId),
              selectedEventId: selectedEvent?.id ?? null,
            }}
          />
        ) : null}

        <div className="p-4">
          <form onSubmit={handleSubmit}>
            <Input
              handleInputChange={handleInputChange}
              input={input}
              isDisabled={isDesktopPreparing}
              isLoading={isLoading}
              status={status}
              stop={stop}
              submitLabel="Send message"
              className="pr-14"
            />
          </form>
        </div>
      </footer>
    </div>
  );
}
