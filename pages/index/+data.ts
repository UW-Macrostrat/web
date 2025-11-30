import { fetchAPIData } from "~/_utils";

interface PageStats {
  columns: number;
  units: number;
  polygons: number;
  projects: number;
}

export async function data(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

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
  };
}
