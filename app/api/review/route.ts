import { createReviewHandler } from "../../../lib/server/review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const POST = createReviewHandler();
