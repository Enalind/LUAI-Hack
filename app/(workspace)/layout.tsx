import { ConfigurationError, getServerConfig } from "@/lib/server/config";
import { Workspace } from "@/components/workspace";
import { developmentCases } from "@/fixtures/development/cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  let mode: "mock" | "live" | null = null;
  let configurationError: string | null = null;
  try {
    mode = getServerConfig().mode;
  } catch (error) {
    configurationError = error instanceof ConfigurationError ? error.message : "Serverkonfigurationen kunde inte läsas.";
  }
  return <><Workspace examples={developmentCases} mode={mode} configurationError={configurationError} />{children}</>;
}
