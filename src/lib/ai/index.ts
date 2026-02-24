import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

export type { AIProvider };

/** Get the configured AI provider based on AI_PROVIDER env var */
export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "mock";

  switch (provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "mock":
    default:
      return new MockAIProvider();
  }
}
