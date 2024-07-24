import { PageContext } from "vike/types";

export async function data(pageContext: PageContext) {
  const { cog_id, system, system_version } = pageContext.routeParams;
  const baseURL = pageContext.urlParsed.origin;
  const url = `${baseURL}/cdr/v1/tiles/cog/${cog_id}/system/${system}/system_version/${system_version}`;

  const res = await fetch(url);
  const data = await res.json();

  // Get projected COG info
  const projInfo = await fetch(
    `${baseURL}/cdr/v1/maps/cog/projections/${cog_id}`
  );
  const projData = await projInfo.json();

  // Get first validated projection
  // This could probably be improved
  const matchingProj = projData.find((d) => d.status == "validated");

  const rasterURL = matchingProj?.download_url;

  return {
    cog_id,
    system,
    system_version,
    rasterURL,
    envelope: data.web_geom,
  };
}
