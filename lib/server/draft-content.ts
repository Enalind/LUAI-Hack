import "server-only";
import { z } from "zod";
import { providerClaimSchema, providerSectionSchema } from "../schemas";
import { resolveTextSpan } from "../text-annotations";
import { ApplicationError } from "./errors";

const textPartSchema = z.strictObject({
  text: z.string().min(1).max(30_000),
  referenceIndices: z.array(z.number().int().min(0).max(19)).max(20),
});
const claimSchema = providerClaimSchema.omit({ text: true, evidenceSpans: true }).extend({ textParts: z.array(textPartSchema).min(1).max(100) });
export const liveDraftContentSchema = z.strictObject({
  sections: z.array(providerSectionSchema.extend({ claims: z.array(claimSchema).max(100) })).length(4),
});

/** Assemble literal model-written parts. No rewriting, fuzzy matching or citation repair. */
export function assembleDraftContent(content: z.infer<typeof liveDraftContentSchema>) {
  return { sections: content.sections.map((section) => ({ ...section, claims: section.claims.map(({ textParts, ...claim }) => {
    const text = textParts.map((part) => part.text).join("");
    let offset = 0;
    const evidenceSpans = textParts.flatMap((part) => {
      const start = offset;
      offset += part.text.length;
      if (!part.referenceIndices.length) return [];
      let position = -part.text.length, occurrence = 0;
      do { position = text.indexOf(part.text, position + part.text.length); occurrence++; } while (position >= 0 && position < start);
      const span = { text: part.text, occurrence, referenceIndices: part.referenceIndices };
      // Reject unusual overlapping repetitions that the existing occurrence contract cannot represent.
      if (position !== start || resolveTextSpan(text, span)?.start !== start) {
        throw new ApplicationError("INVALID_MODEL_OUTPUT", "Textmarkeringarna kunde inte förankras i utkastet. Försök igen.", 502);
      }
      return [span];
    });
    return { ...claim, text, evidenceSpans };
  }) })) };
}
