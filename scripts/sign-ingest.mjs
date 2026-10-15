/**
 * Prints the headers needed to call POST /api/ingest manually.
 *
 * Usage:
 *   node scripts/sign-ingest.mjs <url> <secret> [body]
 *
 * Example:
 *   node scripts/sign-ingest.mjs https://example.com/api/ingest "$INGEST_HMAC_SECRET"
 *
 * Then:
 *   curl -X POST <url> \
 *     -H "Content-Type: application/json" \
 *     -H "X-Ingest-Timestamp: <ts>" \
 *     -H "X-Ingest-Signature: sha256=<sig>" \
 *     --data '{}'
 *
 * The same scheme is used by .github/workflows/ingest.yml.
 */

import { createHmac } from "node:crypto";

const [, , url, secret, body = "{}"] = process.argv;

if (!url || !secret) {
  console.error("Usage: node scripts/sign-ingest.mjs <url> <secret> [body]");
  process.exit(1);
}

const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac("sha256", secret)
  .update(`${timestamp}.${body}`)
  .digest("hex");

console.log(`URL:       ${url}`);
console.log(`Timestamp: ${timestamp}`);
console.log(`Signature: sha256=${signature}`);
console.log("");
console.log("curl:");
console.log(
  `  curl -i -X POST '${url}' \\\n` +
    `    -H 'Content-Type: application/json' \\\n` +
    `    -H 'X-Ingest-Timestamp: ${timestamp}' \\\n` +
    `    -H 'X-Ingest-Signature: sha256=${signature}' \\\n` +
    `    --data '${body}'`,
);
