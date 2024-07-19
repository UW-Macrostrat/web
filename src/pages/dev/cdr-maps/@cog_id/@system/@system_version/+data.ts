import { PageContext } from "vike/types";

export async function data(pageContext: PageContext) {
  const { cog_id, system, system_version } = pageContext.routeParams;

  const url = `http://localhost:3000/tiles/cog/${cog_id}/system/${system}/system_version/${system_version}`;
  const res = await fetch(url);
  const data = await res.json();

  return {
    cog_id,
    system,
    system_version,
    envelope: data.web_geom,
  };
}
