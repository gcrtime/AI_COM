export const DEFAULT_CHAT_ERROR_MESSAGE =
  "The agent ran into an error. Please try again.";

export function getChatErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    const message = error.trim();
    if (message.length > 0) {
      return message;
    }
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0) {
      return message;
    }
  }

  return DEFAULT_CHAT_ERROR_MESSAGE;
}
