import { fetchAPIData } from "~/_utils";

export async function data(pageContext) {
  const timescale_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [res, intervals] = await Promise.all([
    fetchAPIData("/defs/timescales", { all: true }),
    fetchAPIData("/defs/intervals", { timescale_id, all: true }),
  ]);

  return { res, intervals, id: timescale_id };
}
