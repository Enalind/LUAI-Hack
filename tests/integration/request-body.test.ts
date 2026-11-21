import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { MAX_REQUEST_BYTES, draftRequestSchema } from "../../lib/schemas";
import { readJsonRequest } from "../../lib/server/request-body";
import { developmentCases } from "../../fixtures/development/cases";

const body = {
  requestId: "d3faee2b-b031-4c54-8bdc-d572a17d19b1", sourceRevision: 0, draftRevision: 0,
  caseId: "D2", input: developmentCases[1].input,
};
function request(text: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/draft", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: text });
}

describe("bounded server request parsing", () => {
  it("parses UTF-8 Swedish source text without changing it", async () => {
    expect(await readJsonRequest(request(JSON.stringify(body)), draftRequestSchema)).toEqual(body);
  });

  it.each(["not json", "null", "[]", "{}", JSON.stringify({ ...body, input: { ...body.input, consultationText: "  ", referenceMaterials: [] } })])("rejects malformed or invalid input safely", async (text) => {
    await expect(readJsonRequest(request(text), draftRequestSchema)).rejects.toMatchObject({ code: "INVALID_INPUT", status: 400, retryable: false });
  });

  it("rejects oversized fields even when below the byte cap", async () => {
    const text = JSON.stringify({ ...body, input: { ...body.input, consultationText: "a".repeat(30_001) } });
    await expect(readJsonRequest(request(text), draftRequestSchema)).rejects.toMatchObject({ code: "INVALID_INPUT", status: 400 });
  });

  it("rejects a request based on actual bytes even when Content-Length is absent or false", async () => {
    // Multi-byte input is below the limit in JS characters and above it in UTF-8 bytes.
    const oversized = " ".repeat(100) + "ö".repeat(MAX_REQUEST_BYTES / 2);
    expect(oversized.length).toBeLessThan(MAX_REQUEST_BYTES);
    const headerCases: Record<string, string>[] = [{}, { "Content-Length": "1" }];
    for (const headers of headerCases) {
      await expect(readJsonRequest(request(oversized, headers), draftRequestSchema)).rejects.toMatchObject({ code: "INPUT_TOO_LARGE", status: 413 });
    }
  });

  it("rejects declared oversize without reading the body", async () => {
    const req = request(JSON.stringify(body), { "Content-Length": String(MAX_REQUEST_BYTES + 1) });
    await expect(readJsonRequest(req, draftRequestSchema)).rejects.toMatchObject({ code: "INPUT_TOO_LARGE" });
    expect(req.bodyUsed).toBe(false);
  });

  it("cancels a streaming request as soon as the byte limit is exceeded", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES));
        controller.enqueue(new Uint8Array(1));
      },
      cancel,
    });
    const req = new Request("http://localhost/api/draft", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: stream, duplex: "half",
    } as RequestInit);
    await expect(readJsonRequest(req, draftRequestSchema)).rejects.toMatchObject({ code: "INPUT_TOO_LARGE" });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("preserves a multi-byte Swedish character split across stream chunks", async () => {
    const encoded = new TextEncoder().encode(JSON.stringify(body));
    const splitAt = encoded.findIndex((byte) => byte > 127) + 1;
    expect(splitAt).toBeGreaterThan(0);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, splitAt));
        controller.enqueue(encoded.slice(splitAt));
        controller.close();
      },
    });
    const req = new Request("http://localhost/api/draft", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: stream, duplex: "half",
    } as RequestInit);
    expect(await readJsonRequest(req, draftRequestSchema)).toEqual(body);
  });

  it("accepts a body exactly at the byte cap", async () => {
    const json = JSON.stringify(body);
    const padding = MAX_REQUEST_BYTES - new TextEncoder().encode(json).byteLength;
    expect(await readJsonRequest(request(`${json}${" ".repeat(padding)}`), draftRequestSchema)).toEqual(body);
  });

  it("rejects invalid UTF-8, missing content type and an empty body", async () => {
    const invalidUtf8 = new Request("http://localhost/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: new Uint8Array([0xff]) });
    await expect(readJsonRequest(invalidUtf8, draftRequestSchema)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(readJsonRequest(new Request("http://localhost/api/draft", { method: "POST", body: "{}" }), draftRequestSchema)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(readJsonRequest(new Request("http://localhost/api/draft", { method: "POST", headers: { "Content-Type": "application/json" } }), draftRequestSchema)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});
