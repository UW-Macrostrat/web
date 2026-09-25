/** The renderer's settings: a flag wins over its environment variable, which
 * wins over the default. The container is configured by environment alone;
 * the flags are for running it by hand.
 *
 * | Flag          | Variable                   | Default                  |
 * | ------------- | -------------------------- | ------------------------ |
 * | `--site-url`  | `MAP_SNAPSHOTS_SITE_URL`   | `http://localhost:3000`  |
 * | `--out`       | `MAP_SNAPSHOTS_OUT`        | `dist/map-snapshots`     |
 * | `--only`      | `MAP_SNAPSHOTS_ONLY`       | every view (comma list)  |
 * | `--timeout`   | `MAP_SNAPSHOTS_TIMEOUT_MS` | `120000`                 |
 * | `--chromium`  | `CHROMIUM_PATH`            | Playwright's, then Chrome |
 */
import { isAbsolute, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { RenderOptions } from "./render";

export function readRenderOptions(
  defaults: Partial<RenderOptions> = {}
): RenderOptions {
  const { values } = parseArgs({
    options: {
      "site-url": { type: "string" },
      out: { type: "string" },
      only: { type: "string", multiple: true },
      timeout: { type: "string" },
      chromium: { type: "string" },
    },
  });
  const env = process.env;

  const only = (values.only ?? splitList(env.MAP_SNAPSHOTS_ONLY)).flatMap(splitList);
  const timeout = values.timeout ?? env.MAP_SNAPSHOTS_TIMEOUT_MS;

  return {
    siteURL:
      values["site-url"] ?? env.MAP_SNAPSHOTS_SITE_URL ?? defaults.siteURL ?? "http://localhost:3000",
    outDir: fromInvocationDir(
      values.out ?? env.MAP_SNAPSHOTS_OUT ?? defaults.outDir ?? "dist/map-snapshots"
    ),
    only,
    timeoutMs: timeout == null ? defaults.timeoutMs : Number(timeout),
    chromiumPath: values.chromium ?? env.CHROMIUM_PATH ?? defaults.chromiumPath,
  };
}

function splitList(value: string | undefined): string[] {
  if (value == null) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

/** `yarn workspace … run` runs in this package's directory; a relative path
 * means relative to wherever the command was typed. */
function fromInvocationDir(path: string): string {
  if (isAbsolute(path)) return path;
  return resolve(process.env.INIT_CWD ?? process.cwd(), path);
}
