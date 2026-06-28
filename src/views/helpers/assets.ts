import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const STYLESHEET = "./public/dist.css";

let version: string | undefined;

/**
 * Cache-busting token for the compiled stylesheet: a short content hash so the
 * `/dist.css` URL changes whenever the CSS does, and browsers (Safari especially)
 * can't keep serving a stale copy after a deploy. Computed once per process —
 * production restarts on each deploy, so the hash refreshes then. Falls back to
 * "dev" when the build output isn't present (e.g. unit tests that render templates
 * without building CSS).
 */
export function cssVersion(): string {
  if (version === undefined) {
    try {
      version = createHash("sha256").update(readFileSync(STYLESHEET)).digest("hex").slice(0, 8);
    } catch {
      version = "dev";
    }
  }
  return version;
}
