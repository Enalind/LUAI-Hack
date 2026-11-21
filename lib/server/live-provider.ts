import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { APICallError, generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import { decisionsEqual, draftDocumentSchema, type ProviderMetadata, type SourceSnapshot } from "../schemas";
import type { getServerConfig } from "./config";
import { ApplicationError } from "./errors";
import type { CertificateProvider, ProviderCallOptions, ProviderReviewInput } from "./provider";
import { validateDraftOutput, validateReviewOutput } from "./provider-output";
import { validateSourceSnapshot } from "./source-snapshot";
import { DRAFT_PROMPT_VERSION, DRAFT_SYSTEM_PROMPT, draftUserData, liveDraftContentSchema,
  REVIEW_PROMPT_VERSION, REVIEW_SYSTEM_PROMPT, reviewUserData, liveReviewContentSchema } from "./prompts";

export const LIVE_TIMEOUT_MS = 60_000;
export const MAX_OUTPUT_TOKENS = 6_000;
const MAX_RETRY_DELAY_MS = 5_000;
type LiveConfig = Extract<ReturnType<typeof getServerConfig>, { mode: "live" }>;
type LiveProviderOptions = { fetch?: typeof globalThis.fetch; timeoutMs?: number; maxRetries?: 0 | 1 };

function timeoutError() {
  return new ApplicationError("REQUEST_TIMEOUT", "Förfrågan avbröts eller tog för lång tid. Dina uppgifter finns kvar. Försök igen.", 504, true);
}
function invalidOutput(): never {
  throw new ApplicationError("INVALID_MODEL_OUTPUT", "Modellsvaret kunde inte valideras mot underlaget. Försök igen eller kontrollera källorna.", 502);
}

/** Enforce the deadline even if a transport ignores AbortSignal. */
function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); reject(timeoutError()); };
    operation.then((value) => { signal.removeEventListener("abort", abort); resolve(value); },
      (error) => { signal.removeEventListener("abort", abort); reject(error); });
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

async function waitForRetry(delay: number, signal: AbortSignal) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await abortable(new Promise<void>((resolve) => { timer = setTimeout(resolve, delay); }), signal); }
  finally { clearTimeout(timer); }
}

/** Respect both Retry-After forms; never shorten a provider-requested wait. */
function retryDelay(error: APICallError): number {
  const headers = error.responseHeaders;
  const milliseconds = headers?.["retry-after-ms"];
  if (milliseconds && /^\d+(\.\d+)?$/.test(milliseconds)) return Number(milliseconds);
  const after = headers?.["retry-after"];
  if (!after) return 750;
  const delay = /^\d+(\.\d+)?$/.test(after) ? Number(after) * 1000 : Date.parse(after) - Date.now();
  return Number.isFinite(delay) ? Math.max(0, delay) : 750;
}

function safeProviderError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)) {
    if (NoObjectGeneratedError.isInstance(error) && error.finishReason === "content-filter") {
      return new ApplicationError("GENERATION_FAILED", "Modellen avböjde förfrågan. Kontrollera det fiktiva underlaget.", 502);
    }
    return new ApplicationError("INVALID_MODEL_OUTPUT", "Modellsvaret var ofullständigt eller hade fel format. Försök igen.", 502);
  }
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) return new ApplicationError("PROVIDER_RATE_LIMITED", "Modelltjänsten tar emot för många förfrågningar. Vänta en stund och försök igen.", 429, true);
    const transient = error.statusCode === undefined || error.statusCode >= 500;
    return new ApplicationError("PROVIDER_UNAVAILABLE", transient ? "Modelltjänsten är tillfälligt otillgänglig. Försök igen." : "Modelltjänsten kunde inte användas. Kontrollera serverns modellkonfiguration och behörighet.", 503, transient);
  }
  return new ApplicationError("GENERATION_FAILED", "Modellanropet kunde inte slutföras. Dina uppgifter finns kvar. Försök igen.", 502, true);
}

export class LiveProvider implements CertificateProvider {
  constructor(private readonly config: LiveConfig, private readonly options: LiveProviderOptions = {}) {}

  private async generate<T>(schema: z.ZodType<T>, system: string, prompt: string, promptVersion: string,
    validate: (content: T, metadata: ProviderMetadata) => void, options: ProviderCallOptions, retries: 0 | 1) {
    const started = Date.now();
    const budget = this.options.timeoutMs ?? LIVE_TIMEOUT_MS;
    const deadline = new AbortController();
    const signal = options.signal ? AbortSignal.any([deadline.signal, options.signal]) : deadline.signal;
    const timer = setTimeout(() => deadline.abort(), budget);
    const anthropic = createAnthropic({ apiKey: this.config.apiKey, fetch: this.options.fetch });
    try {
      for (let attempt = 0; ; attempt++) {
        if (signal.aborted) throw timeoutError();
        try {
          const result = await abortable(generateText({
            model: anthropic(this.config.model),
            system, prompt,
            output: Output.object({ schema, name: "certificate_output" }),
            providerOptions: { anthropic: { structuredOutputMode: "outputFormat" } },
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            maxRetries: 0, // Retry here so long Retry-After values never get shortened by SDK defaults.
            abortSignal: signal,
            timeout: { totalMs: Math.max(1, budget - (Date.now() - started)) },
            include: { requestBody: false, requestMessages: false, responseBody: false },
            telemetry: { isEnabled: false, recordInputs: false, recordOutputs: false },
          }), signal);
          if (result.finishReason !== "stop") {
            throw new ApplicationError("GENERATION_FAILED", result.finishReason === "content-filter"
              ? "Modellen avböjde förfrågan. Kontrollera det fiktiva underlaget."
              : "Modellsvaret avslutades innan ett fullständigt svar skapades. Försök igen.", 502);
          }
          const parsed = schema.safeParse(result.output);
          if (!parsed.success) invalidOutput();
          const usage = result.totalUsage;
          const metadata: ProviderMetadata = {
              mode: "live" as const, modelId: result.response.modelId ?? this.config.model,
              promptVersion, latencyMs: Date.now() - started,
              usage: { inputTokens: usage.inputTokens ?? null, outputTokens: usage.outputTokens ?? null,
                reasoningTokens: usage.outputTokenDetails.reasoningTokens ?? null, totalTokens: usage.totalTokens ?? null },
          };
          validate(parsed.data, metadata);
          if (signal.aborted || Date.now() - started >= budget) throw timeoutError();
          return { content: parsed.data, metadata };
        } catch (error) {
          if (signal.aborted) throw timeoutError();
          if (APICallError.isInstance(error) && (error.statusCode === 429 || (error.statusCode !== undefined && error.statusCode >= 500))
            && attempt < retries) {
            const delay = retryDelay(error);
            if (delay <= MAX_RETRY_DELAY_MS && delay + 1_000 < budget - (Date.now() - started)) {
              await waitForRetry(delay, signal);
              continue;
            }
          }
          throw safeProviderError(error);
        }
      }
    } finally { clearTimeout(timer); }
  }

  async draft(value: SourceSnapshot, options: ProviderCallOptions = {}) {
    const snapshot = validateSourceSnapshot(value);
    const result = await this.generate(liveDraftContentSchema, DRAFT_SYSTEM_PROMPT, draftUserData(snapshot), DRAFT_PROMPT_VERSION,
      (content, metadata) => {
        if (content.sections.some((section) => !section.claims.length && !section.informationGaps.length)) invalidOutput();
        if (validateDraftOutput(snapshot, { ...content, metadata }).validationFindings.length) invalidOutput();
      }, options, this.options.maxRetries ?? 1);
    return { ...result.content, metadata: result.metadata };
  }

  async review({ snapshot: value, draft: draftValue }: ProviderReviewInput, options: ProviderCallOptions = {}) {
    const snapshot = validateSourceSnapshot(value);
    const draft = draftDocumentSchema.parse(draftValue);
    if (!decisionsEqual(draft.explicitDecision, snapshot.input.explicitDecision)) {
      throw new ApplicationError("INVALID_INPUT", "Läkarens beslut måste motsvara källversionen.", 400);
    }
    const result = await this.generate(liveReviewContentSchema, REVIEW_SYSTEM_PROMPT, reviewUserData({ snapshot, draft }), REVIEW_PROMPT_VERSION,
      (content, metadata) => { validateReviewOutput(snapshot, draft, { ...content, metadata }); }, options, 0);
    return { ...result.content, metadata: result.metadata };
  }
}
