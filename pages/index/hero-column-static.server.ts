/** The still's column: a featured area's stratigraphic column, rendered on the
 * server to static markup, so the homepage opens with the column beside the
 * map and ships no column JavaScript until the reader engages. (Column-views
 * reaches mapbox-gl through map-views, so hydrating it would put the map's
 * weight back on the page the still exists to keep it off.)
 *
 * Two renders per column, light and dark. Unit fills are adapted to the theme
 * (`asUnitBackground`), and the theme is only known in the browser — the class
 * goes on `<body>` before first paint — so both are sent and CSS shows one.
 * They differ only in their fills, which gzip mostly absorbs.
 *
 * The opening area's column travels with the page; the others come from
 * `/_hero/still-column/<area>` (server/entry.ts) when the still's carousel
 * reaches them.
 *
 * Columns, the timescale and the markup are cached in the server's memory:
 * they change on the order of days, and the homepage shouldn't ask the API for
 * a column, or render one, on every request. A failed lookup is cached
 * briefly, so a slow API doesn't see a retry per page view.
 */
import h from "@macrostrat/hyper";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GeologicPattern,
  GeologicPatternProvider,
} from "@macrostrat/column-components";
import { resolvePattern } from "~/_utils";
import { PatternProvider } from "~/_providers";
import { areaByID, columnPageHref, type FeaturedArea } from "./featured-areas";
import {
  ColumnDisplayContext,
  ColumnPanel,
  type StaticHeroColumn,
} from "./hero-column";
import {
  fetchColumnAtPoint,
  fetchColumnByID,
  type HeroColumn,
} from "./hero-data";
import { fetchTimescale } from "./hero-snapshot";
import { sortedIntervals, timeRangeForSpec } from "./time-range";

/** A featured area's column, as the live hero seeds itself with — from the
 * cache. */
export function featuredAreaColumn(
  area: FeaturedArea
): Promise<HeroColumn | null> {
  return cached(columnCache, area.id, () => fetchArea(area));
}

/** The still's column for an area, by id: null when the id isn't a featured
 * area, or the area has no column. */
export async function stillColumnFor(
  areaID: string
): Promise<StaticHeroColumn | null> {
  const area = areaByID(areaID);
  if (area == null) return null;
  const [column, timescale] = await Promise.all([
    featuredAreaColumn(area),
    cached(timescaleCache, "international", fetchTimescale),
  ]);
  if (column == null || column.units == null || column.units.length === 0) {
    return null;
  }

  // Memoized on the exact column and timescale objects, which the caches hand
  // back unchanged until they refresh.
  const memo = markupCache.get(column);
  if (memo != null && memo.timescale === timescale) return memo.markup;
  const markup = renderStillColumn(area, column, timescale);
  markupCache.set(column, { timescale, markup });
  return markup;
}

/** The column as the live hero first draws it for this area: its opening age
 * filter applied, colored off the international timescale. */
function renderStillColumn(
  area: FeaturedArea,
  column: HeroColumn,
  timescale: Map<number, any> | null
): StaticHeroColumn {
  const intervals = sortedIntervals(timescale);
  const timeRange = timeRangeForSpec(area.ageRange, timescale);
  const href = columnPageHref(column.info);
  const render = (inDarkMode: boolean) =>
    withPatternDefs(
      renderToStaticMarkup(
        h(
          PatternProvider,
          h(
            ColumnDisplayContext.Provider,
            { value: { timeRange, intervals, inDarkMode } },
            h(ColumnPanel, { column, href })
          )
        )
      )
    );
  return { light: render(false), dark: render(true) };
}

/** Fill in the lithology patterns the markup refers to.
 *
 * The column registers each pattern it uses from an effect, and effects don't
 * run on the server, so its `<defs>` comes out empty while the units still
 * point at `url(#<uuid>-<pattern>)`. The same `GeologicPattern` elements the
 * client would add go into the first empty `<defs>`: ids are document-wide, so
 * one place serves every section. */
function withPatternDefs(markup: string): string {
  const references = new Map<string, { prefix: string; id: number }>();
  for (const match of markup.matchAll(/url\(#(uuid-\d+)-(\d+)\)/g)) {
    references.set(`${match[1]}-${match[2]}`, {
      prefix: match[1],
      id: Number(match[2]),
    });
  }
  if (references.size === 0) return markup;

  const patterns = renderToStaticMarkup(
    h(
      GeologicPatternProvider,
      { resolvePattern },
      Array.from(references.values()).map(({ prefix, id }) =>
        h(GeologicPattern, { prefix, id, width: 100, height: 100 })
      )
    )
  );
  return markup.replace("<defs></defs>", `<defs>${patterns}</defs>`);
}

/** A column whose units didn't arrive counts as a miss, so it is retried
 * soon rather than held for the full TTL. */
async function fetchArea(area: FeaturedArea): Promise<HeroColumn | null> {
  let column: HeroColumn | null;
  if (area.columnID != null) {
    column = await fetchColumnByID(area.columnID);
  } else {
    column = await fetchColumnAtPoint(area.view.lat, area.view.lng);
  }
  if (column?.units == null) return null;
  return column;
}

/* ------------------------------------------------------------------ caches */

const TTL_MS = 60 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  at: number;
  ttl: number;
  value: Promise<T>;
}

const columnCache = new Map<string, CacheEntry<HeroColumn | null>>();
const timescaleCache = new Map<string, CacheEntry<Map<number, any> | null>>();
const markupCache = new WeakMap<
  HeroColumn,
  { timescale: Map<number, any> | null; markup: StaticHeroColumn }
>();

/** One pending or settled lookup per key, refreshed after its TTL. The
 * fetchers return null rather than throw, and a null is a miss worth retrying
 * sooner. */
function cached<T>(
  cache: Map<string, CacheEntry<T | null>>,
  key: string,
  fetch: () => Promise<T | null>
): Promise<T | null> {
  const hit = cache.get(key);
  if (hit != null && Date.now() - hit.at < hit.ttl) return hit.value;
  const entry: CacheEntry<T | null> = {
    at: Date.now(),
    ttl: TTL_MS,
    value: fetch(),
  };
  cache.set(key, entry);
  entry.value.then((value) => {
    if (value == null) entry.ttl = FAILURE_TTL_MS;
  });
  return entry.value;
}
