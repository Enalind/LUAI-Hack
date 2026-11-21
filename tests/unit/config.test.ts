import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { ConfigurationError, getServerConfig } from "../../lib/server/config";

describe("server configuration", () => {
  it("defaults to mock without credentials", () => {
    expect(getServerConfig({})).toEqual({ mode: "mock" });
  });

  it("requires an explicit valid mode on Vercel", () => {
    expect(getServerConfig({ VERCEL: "1", AI_MODE: "mock", ANTHROPIC_API_KEY: "test-only-secret" })).toEqual({ mode: "mock" });
    expect(() => getServerConfig({ VERCEL: "1", ANTHROPIC_API_KEY: "test-only-secret" })).toThrow("Vercel-demot kräver AI_MODE=mock eller AI_MODE=live.");
    expect(() => getServerConfig({ VERCEL: "1", AI_MODE: "invalid" })).toThrow("AI_MODE måste vara mock eller live.");
  });

  it("does not include unused credentials in mock configuration", () => {
    expect(getServerConfig({ AI_MODE: "mock", ANTHROPIC_API_KEY: "test-only-secret" })).toEqual({ mode: "mock" });
  });

  it.each(["", "MOCK", "replay", "live test-only-secret"])("rejects invalid mode %s safely", (mode) => {
    expect(() => getServerConfig({ AI_MODE: mode })).toThrow("AI_MODE måste vara mock eller live.");
  });

  describe.each([undefined, "1"])("live configuration with VERCEL=%s", (vercel) => {
    it.each([undefined, "", "  "])("rejects live without a usable key (%s)", (key) => {
      expect(() => getServerConfig({ VERCEL: vercel, AI_MODE: "live", ANTHROPIC_API_KEY: key })).toThrow(ConfigurationError);
      expect(() => getServerConfig({ VERCEL: vercel, AI_MODE: "live", ANTHROPIC_API_KEY: key })).toThrow("Live-läge kräver ANTHROPIC_API_KEY");
    });

    it("supports live configuration with default and custom models", () => {
      expect(getServerConfig({ VERCEL: vercel, AI_MODE: "live", ANTHROPIC_API_KEY: "test-only-secret" })).toEqual({
        mode: "live", apiKey: "test-only-secret", model: "claude-sonnet-5-5",
      });
      expect(getServerConfig({ VERCEL: vercel, AI_MODE: "live", ANTHROPIC_API_KEY: "test-only-secret", ANTHROPIC_MODEL: "custom-model" })).toMatchObject({ model: "custom-model" });
    });
  });

  it("rejects a blank explicit model without echoing credentials", () => {
    expect(() => getServerConfig({ AI_MODE: "live", ANTHROPIC_API_KEY: "test-only-secret", ANTHROPIC_MODEL: " " })).toThrow("ANTHROPIC_MODEL får inte vara tom i live-läge.");
  });
});
