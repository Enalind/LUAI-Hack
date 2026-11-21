import { createDraftHandler } from "../../../lib/server/draft-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const POST = createDraftHandler();
