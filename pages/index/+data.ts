import { fetchAPIData } from "~/_utils";
import { parse as parseYaml } from "yaml";

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

export async function data(pageContext) {
  const data = await fetchAPIData("/stats", { all: true });

  let columns = 0;
  let units = 0;
  let polygons = 0;

  data.forEach((project) => {
    columns += project.columns;
    units += project.units;
    polygons += project.t_polys;
  });

  const stats: PageStats = {
    columns,
    units,
    polygons,
    projects: data.length,
  };

  return {
    stats,
    news: latestNews(),
  };
}
