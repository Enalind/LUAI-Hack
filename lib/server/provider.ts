import "server-only";
import type { DraftDocument, ProviderDraftOutput, ProviderReviewOutput, SourceSnapshot } from "../schemas";

export type ProviderReviewInput = { snapshot: SourceSnapshot; draft: DraftDocument };
export type ProviderCallOptions = { signal?: AbortSignal };

/** Exactly two operations; neither operation owns clinician decisions. */
export interface CertificateProvider {
  draft(snapshot: SourceSnapshot, options?: ProviderCallOptions): Promise<ProviderDraftOutput>;
  review(input: ProviderReviewInput, options?: ProviderCallOptions): Promise<ProviderReviewOutput>;
}
