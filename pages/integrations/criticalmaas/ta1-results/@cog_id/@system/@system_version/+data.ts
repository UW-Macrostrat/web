import { PageContext } from "vike/types";
import { cdrPrefix, cdrAPIKey } from "@macrostrat-web/settings";

export async function data(pageContext: PageContext) {
  const { cog_id, system, system_version } = pageContext.routeParams;
  const url = `${cdrPrefix}/tiles/cog/${cog_id}/system/${system}/system_version/${system_version}`;

  let headers = null;
  /** We really aren't supposed to leak this to the client, but if we are testing locally, we can
   * directly use the API key. For public usage, we'll use an API key
   */
  if (cdrAPIKey != null) {
    headers = { Authorization: `Bearer ${cdrAPIKey}` };
  }

  const res = await fetch(url, { headers });
  const data = await res.json();

  // Get projected COG info
  const projInfo = await fetch(`${cdrPrefix}/maps/cog/projections/${cog_id}`);
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
