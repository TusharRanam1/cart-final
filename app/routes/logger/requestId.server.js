import crypto from "node:crypto";

/**
 * Returns a stable request correlation ID.
 *
 * Priority:
 * 1. Reverse proxy / gateway request ID
 * 2. Shopify webhook ID (best for webhooks)
 * 3. Generated internal request ID (cron / manual / jobs)
 */
export function getRequestId(request) {
  if (request && request.headers) {
    return (
      request.headers.get("x-request-id") ||
      request.headers.get("x-shopify-webhook-id") ||
      crypto.randomUUID()
    );
  }

  // Non-HTTP contexts (cron, workers, manual jobs)
  return crypto.randomUUID();
}
