import { createAnthropic } from "@ai-sdk/anthropic";

const baseURL = process.env.ANTHROPIC_BASE_URL?.trim() || undefined;
const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || undefined;

export const anthropic = createAnthropic({
  apiKey,
  baseURL,
});
