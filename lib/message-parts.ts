import type { Message, UIMessage } from "ai";

type TextPart = { type: "text"; text: string };
type RenderablePart = NonNullable<UIMessage["parts"]>[number] | TextPart;

/** Normalize legacy `content`-only messages into renderable parts. */
export function getMessageParts(
  message: Message | UIMessage,
): RenderablePart[] {
  if (message.parts && message.parts.length > 0) {
    const renderableParts = message.parts.filter((part) => {
      if (part.type === "text") {
        return part.text.trim().length > 0;
      }

      return part.type === "tool-invocation";
    });

    if (renderableParts.length > 0) {
      return renderableParts;
    }
  }

  const content = readMessageContentText(message.content);

  if (content) {
    return [{ type: "text", text: content }];
  }

  return [];
}

function readMessageContentText(content: unknown) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const text = content
    .map((item: unknown) => {
      if (typeof item === "string") {
        return item;
      }

      if (
        item &&
        typeof item === "object" &&
        "type" in item &&
        item.type === "text" &&
        "text" in item &&
        typeof item.text === "string"
      ) {
        return item.text;
      }

      return "";
    })
    .join("")
    .trim();

  return text;
}
