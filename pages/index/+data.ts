import { fetchAPIData } from "~/_utils";
import { postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "cross-fetch";
import { parse as parseYaml } from "yaml";
import {
  randomFeaturedArea,
  featuredAreas,
  type FeaturedArea,
} from "./featured-areas";
import { resolveMapSnapshots } from "~/map-snapshots/store.server";
import type { MapSnapshotImage } from "~/map-snapshots/spec";
import { heroSnapshotSpec } from "./hero-snapshot";
import type { HeroColumn } from "./hero-data";
import {
  featuredAreaColumn,
  stillColumnFor,
} from "./hero-column-static.server";
import type { StaticHeroColumn } from "./hero-column";

export interface PageStats {
  /** Finalized map sources. Null when the count couldn't be had. */
  maps: number | null;
  /** Legend items across those maps, as `/legend` lists them. */
  legendItems: number | null;
  columns: number;
  units: number;
  polygons: number;
  projects: number;
}

interface NewsItem {
  title: string;
  date: string;
  summary: string | null;
  href: string;
}

export interface HeroData {
  /** The featured area the server opened on. */
  area: FeaturedArea;
  /** That area's column, so the first paint has one. Null when the area's
   * point is outside the columns' coverage. */
  column: HeroColumn | null;
  /** A cached still of each featured area's map, by area id — every area, so
   * the carousel can move through them without loading the live map. Absent
   * for an area the renderer hasn't drawn in its current form. */
  snapshots: Record<string, MapSnapshotImage | null>;
  /** That area's column as static markup, light and dark, for the still: the
   * page opens with the column beside the map, and no column JavaScript loads
   * until the reader engages. Other areas' come from `/_hero/still-column/`
   * when the carousel reaches them. Null when the area has no column. */
  stillColumn: StaticHeroColumn | null;
}

/** News posts are pages under `News/` in the documentation vault; drafts live
 * under `__drafts__/` and are not matched here. */
const newsFiles = import.meta.glob("../../content/News/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

function latestNews(limit = 3): NewsItem[] {
  const items: NewsItem[] = [];
  for (const [path, raw] of Object.entries(newsFiles)) {
    const m = FRONTMATTER.exec(raw);
    if (m == null) continue;
    let data: any;
    try {
      data = parseYaml(m[1]) ?? {};
    } catch {
      continue;
    }
    if (data.title == null || data.date == null) continue;
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    items.push({
      title: String(data.title),
      date: String(data.date).slice(0, 10),
      summary: data.summary ?? null,
      href: `/news/${slug}`,
    });
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items.slice(0, limit);
}

/** What the hero opens on: the day's featured area and its column — pinned by
 * id when the area names one, otherwise whatever its view is centred over —
 * that column as the still draws it, and every area's still map. None of it
 * failing takes the page down; the map renders on its own. */
async function heroData(): Promise<HeroData> {
  const area = randomFeaturedArea();
  const [column, stillColumn, snapshots] = await Promise.all([
    featuredAreaColumn(area),
    stillColumnFor(area.id),
    heroSnapshots(),
  ]);
  return { area, column, snapshots, stillColumn };
}

/** Every featured area's still, so the carousel can move through them without
 * the live map. Any the server hasn't drawn yet are queued, and show the cover
 * photo until they exist. */
async function heroSnapshots(): Promise<
  Record<string, MapSnapshotImage | null>
> {
  const images = await resolveMapSnapshots(
    featuredAreas.map(heroSnapshotSpec),
    {
      complete: true,
    }
  );
  const snapshots: Record<string, MapSnapshotImage | null> = {};
  featuredAreas.forEach((area, i) => {
    snapshots[area.id] = images[i];
  });
  return snapshots;
}

/** How many rows a PostgREST route has, from the `Content-Range` an exact
 * count request carries — one row of payload, whatever the table's size. */
async function fetchPGCount(route: string, key: string): Promise<number> {
  const url = `${postgrestPrefix}${route}?select=${key}&limit=1`;
  const res = await fetch(url, { headers: { Prefer: "count=exact" } });
  const range = res.headers.get("content-range") ?? "";
  const match = /\/(\d+)$/.exec(range);
  if (match == null) throw new Error(`No count in Content-Range "${range}"`);
  return parseInt(match[1], 10);
}

const COUNT_TTL_MS = 60 * 60 * 1000;
const countCache = new Map<string, { value: number; expires: number }>();

/** A route's count, held for an hour: the legend count takes the database
 * over a second, and a landing page can't pay that on every render. Null when
 * it can't be had, so the stat is left out rather than shown as zero. */
async function cachedCount(route: string, key: string): Promise<number | null> {
  const cached = countCache.get(route);
  if (cached != null && cached.expires > Date.now()) return cached.value;
  try {
    const value = await fetchPGCount(route, key);
    countCache.set(route, { value, expires: Date.now() + COUNT_TTL_MS });
    return value;
  } catch (error) {
    console.error(`Could not count ${route}:`, error);
    return cached?.value ?? null;
  }
}

export async function data(pageContext) {
  const [statsData, maps, legendItems, hero] = await Promise.all([
    fetchAPIData("/stats", { all: true }),
    // The same finalized set `/maps` lists, so the two figures agree.
    cachedCount("/maps", "source_id"),
    cachedCount("/legend", "legend_id"),
    heroData(),
  ]);

  let columns = 0;
  let units = 0;
  let polygons = 0;

  statsData.forEach((project) => {
    columns += project.columns;
    units += project.units;
    polygons += project.t_polys;
  });

  const stats: PageStats = {
    maps,
    legendItems,
    columns,
    units,
    polygons,
    projects: statsData.length,
  };

  return {
    stats,
    news: latestNews(),
    hero,
  };
}
