import { fetchAPIData } from "~/_utils";

export async function data(pageContext) {
  const lith_att_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [resData, unitsData] = await Promise.all([
    fetchAPIData("/defs/lithology_attributes", { lith_att_id }),
    fetchAPIData("/units", { lith_att_id }),
  ]);

  return { resData: resData[0], unitsData };
}
