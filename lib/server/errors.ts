import "server-only";
import type { ApiError } from "../schemas";

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApiError["code"],
    message: string,
    public readonly status: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
