import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs, fetchPGData } from "~/_utils";

export async function data(pageContext) {
  const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [resData] = await Promise.all([
    fetchPGData("/measurements_with_type", { id: "eq." + id }),
  ]);

  return { resData: resData[0] };
}
