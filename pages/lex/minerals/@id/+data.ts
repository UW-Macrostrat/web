import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";

export async function data(pageContext) {
  const mineral_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [resData] = await Promise.all([
    fetchAPIData("/defs/minerals", { mineral_id }),
  ]);

  return { resData: resData[0] };
}
