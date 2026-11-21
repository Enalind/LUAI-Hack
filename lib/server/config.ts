import "server-only";
import { z } from "zod";

const modeSchema = z.enum(["mock", "live"]);

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

type Environment = Record<string, string | undefined>;
type ServerConfig =
  | { mode: "mock" }
  | { mode: "live"; apiKey: string; model: string };

/** Read at request time; never serialize this object to the browser. */
export function getServerConfig(env: Environment = process.env): ServerConfig {
  // Hosted deployments must choose a mode explicitly; local development defaults to mock.
  if (env.VERCEL === "1" && env.AI_MODE === undefined) {
    throw new ConfigurationError("Vercel-demot kräver AI_MODE=mock eller AI_MODE=live.");
  }
  const result = modeSchema.safeParse(env.AI_MODE ?? "mock");
  if (!result.success) {
    throw new ConfigurationError("AI_MODE måste vara mock eller live.");
  }
  if (result.data === "mock") return { mode: "mock" };

  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new ConfigurationError(
      "Live-läge kräver ANTHROPIC_API_KEY på servern. Ange nyckeln i .env.local eller välj AI_MODE=mock.",
    );
  }
  const model = (env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5").trim();
  if (!model) {
    throw new ConfigurationError("ANTHROPIC_MODEL får inte vara tom i live-läge.");
  }
  return { mode: "live", apiKey, model };
}
