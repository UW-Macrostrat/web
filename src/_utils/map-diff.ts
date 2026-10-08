/** Addresses of the map diff page: `/maps/diff/{left}...{right}`, after GitHub's
 * compare notation. A single slug is compared against `carto`, as GitHub
 * compares a lone branch against the default one. */

import { DEFAULT_COMPILATION } from "./compilations";

const prefix = "/maps/diff";
const separator = "...";

export interface DiffSides {
  left: string;
  right: string;
}

export function diffPath(left: string, right: string): string {
  return `${prefix}/${left}${separator}${right}`;
}

export function parseDiffPath(pathname: string): DiffSides | null {
  if (!pathname.startsWith(prefix)) return null;
  const compare = decodeURIComponent(
    pathname.slice(prefix.length).replace(/^\/|\/$/g, "")
  );
  if (compare == "") return null;

  const parts = compare.split(separator);
  if (parts.length == 1) return { left: DEFAULT_COMPILATION, right: parts[0] };
  if (parts.length != 2 || parts[0] == "" || parts[1] == "") return null;
  return { left: parts[0], right: parts[1] };
}
