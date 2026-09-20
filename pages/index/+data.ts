import { fetchAPIData } from "~/_utils";
import { parse as parseYaml } from "yaml";
import { featuredAreaForToday, type FeaturedArea } from "./featured-areas";
import {
  fetchColumnAtPoint,
  fetchColumnByID,
  type HeroColumn,
} from "./hero-data";

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

export interface HeroData {
  /** The featured area the server opened on. The browser may put its own
   * synthetic "near you" area in front of it. */
  area: FeaturedArea;
  /** That area's column, so the first paint has one. Null when the area's
   * point is outside the columns' coverage. */
  column: HeroColumn | null;
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

/** What the hero opens on: the day's featured area, and its column — pinned by
 * id when the area names one, otherwise whatever its view is centred over.
 * Neither failing takes the page down; the map renders on its own. */
async function heroData(): Promise<HeroData> {
  const area = featuredAreaForToday();
  let column: HeroColumn | null;
  if (area.columnID != null) {
    column = await fetchColumnByID(area.columnID);
  } else {
    column = await fetchColumnAtPoint(area.view.lat, area.view.lng);
  }
  return { area, column };
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
