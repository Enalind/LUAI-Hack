import "server-only";
import type { DraftDocument, ProviderDraftOutput, ProviderReviewOutput, SourceSnapshot } from "../schemas";

export type ProviderReviewInput = { snapshot: SourceSnapshot; draft: DraftDocument };

/** Exactly two operations; neither operation owns clinician decisions. */
export interface CertificateProvider {
  draft(snapshot: SourceSnapshot): Promise<ProviderDraftOutput>;
  review(input: ProviderReviewInput): Promise<ProviderReviewOutput>;
}
