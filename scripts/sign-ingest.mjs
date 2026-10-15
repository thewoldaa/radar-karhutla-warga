/**
 * Prints the headers needed to call POST /api/ingest manually.
 *
 * Usage (secret comes from the environment — never from the command line, where
 * it would leak into `ps` output, shell history, and CI logs):
 *
 *   INGEST_HMAC_SECRET=... node scripts/sign-ingest.mjs <url> [body]
 *
 * Or read the secret from stdin:
 *
 *   node scripts/sign-ingest.mjs <url> --secret-stdin < secret.txt
 *
 * Then copy the printed curl command.
 * The same scheme is used by .github/workflows/ingest.yml.
 */

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const [, , url, maybeBody] = process.argv;

if (!url) {
  console.error("Usage: INGEST_HMAC_SECRET=... node scripts/sign-ingest.mjs <url> [body]");
  console.error("   or: node scripts/sign-ingest.mjs <url> --secret-stdin < secret.txt");
  process.exit(1);
}

let secret = process.env.INGEST_HMAC_SECRET?.trim() ?? "";
let body = maybeBody ?? "{}";

if (maybeBody === "--secret-stdin") {
  body = "{}";
  secret = readFileSync(0, "utf8").trim();
}

if (!secret) {
  console.error(
    "Secret tidak ditemukan. Set INGEST_HMAC_SECRET, atau lewati lewat stdin dengan --secret-stdin.\n" +
      "Demi keamanan, secret TIDAK diterima sebagai argumen command line.",
  );
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
