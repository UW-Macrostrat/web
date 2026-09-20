import { fetchAPIData } from "~/_utils";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { parse as parseYaml } from "yaml";
import { featuredLocationForToday, type FeaturedLocation } from "./featured-locations";

interface PageStats {
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

export interface HeroColumnInfo {
  col_id: number;
  col_name: string;
  col_group: string | null;
  project_id: number;
  t_units: number;
  b_age: number;
  t_age: number;
}

export interface HeroData {
  location: FeaturedLocation;
  column: HeroColumnInfo;
  units: any[];
  /** The column's footprint, if the API returned one. */
  footprint: GeoJSON.Geometry | null;
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

/** The column under the featured location and its units. Null on any failure:
 * the hero then shows its static form rather than the page failing. */
async function heroData(): Promise<HeroData | null> {
  const location = featuredLocationForToday();
  try {
    const columns = await fetchAPIData("/columns", {
      lat: location.lat,
      lng: location.lng,
      response: "long",
      status_code: "active",
    });
    const col = columns[0];
    if (col == null) return null;
    const [units, footprint] = await Promise.all([
      fetchAPIData("/units", {
        col_id: col.col_id,
        response: "long",
        show_position: true,
        status_code: "active",
      }),
      fetchFootprint(col.col_id),
    ]);
    if (units.length === 0) return null;
    return {
      location,
      column: {
        col_id: col.col_id,
        col_name: col.col_name,
        col_group: col.col_group ?? null,
        project_id: col.project_id,
        t_units: col.t_units,
        b_age: col.b_age,
        t_age: col.t_age,
      },
      units,
      footprint,
    };
  } catch (err) {
    console.warn("[homepage] hero data unavailable:", err?.message ?? err);
    return null;
  }
}

async function fetchFootprint(colID: number): Promise<GeoJSON.Geometry | null> {
  try {
    const url = `${apiV2Prefix}/columns?col_id=${colID}&format=geojson_bare`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const body: any = await res.json();
    const feature = body?.features?.[0] ?? body;
    return feature?.geometry ?? null;
  } catch {
    return null;
  }
}

export async function data(pageContext) {
  const [statsData, hero] = await Promise.all([
    fetchAPIData("/stats", { all: true }),
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
