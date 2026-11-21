import "server-only";
import { z } from "zod";
import { MAX_REQUEST_BYTES } from "../schemas";
import { ApplicationError } from "./errors";

function tooLarge(): never {
  throw new ApplicationError("INPUT_TOO_LARGE", "Förfrågan får vara högst 256 KB.", 413);
}

/** Bounded streaming read for future route handlers; Content-Length is only a hint. */
export async function readJsonRequest<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApplicationError("INVALID_INPUT", "Förfrågan måste innehålla JSON.", 400);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_REQUEST_BYTES) tooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new ApplicationError("INVALID_INPUT", "Förfrågan saknar underlag.", 400);

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        tooLarge();
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError("INVALID_INPUT", "Förfrågan kunde inte läsas som UTF-8-text.", 400);
  } finally {
    reader.releaseLock();
  }

  try {
    return schema.parse(JSON.parse(text));
  } catch {
    throw new ApplicationError("INVALID_INPUT", "Kontrollera underlag, beslut, datum och revisionsnummer.", 400);
  }
}
