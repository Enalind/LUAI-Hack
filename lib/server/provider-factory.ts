import "server-only";
import { getServerConfig } from "./config";
import { LiveProvider } from "./live-provider";
import { MockProvider } from "./mock-provider";
import type { CertificateProvider } from "./provider";

export function getCertificateProvider(): CertificateProvider {
  const config = getServerConfig();
  return config.mode === "live" ? new LiveProvider(config) : new MockProvider();
}
