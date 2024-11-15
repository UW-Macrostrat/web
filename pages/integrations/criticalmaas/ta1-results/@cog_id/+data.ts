import { PageContext } from "vike/types";
import { cdrFetch } from "../utils";

export async function data(pageContext: PageContext) {
  const { cog_id } = pageContext.routeParams;

  // Get projected COG info
  const projData = await cdrFetch(`/maps/cog/projections/${cog_id}`);

  if (!Array.isArray(projData)) {
    const rasterURL = `https://s3.amazonaws.com/public.cdr.land/cogs/${cog_id}.cog.tif`;
    return {
      cog_id,
      rasterURL,
    };
  }

  const matchingProj = projData.find((d) => d.status == "validated");

  const rasterURL = matchingProj?.download_url;

  return {
    cog_id,
    rasterURL,
    //envelope: data.web_geom,
  };
}
