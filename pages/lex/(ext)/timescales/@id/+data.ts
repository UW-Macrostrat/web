import { fetchAPIData } from "~/_utils";
import { render } from "vike/abort";
import { INTERNATIONAL_TIMESCALE_ID } from "~/components/lex/timescale-data";

export async function data(pageContext) {
  const timescale_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
  if (isNaN(timescale_id)) {
    throw render(404, "ID must be a number");
  }

  // Await all API calls
  const [res, intervals, referenceIntervals] = await Promise.all([
    fetchAPIData("/defs/timescales", { all: true }),
    fetchAPIData("/defs/intervals", { timescale_id, all: true }),
    fetchAPIData("/defs/intervals", {
      timescale_id: INTERNATIONAL_TIMESCALE_ID,
    }),
  ]);

  // A 404 here rather than a throw in the page, which SSR can't catch
  if (!res.some((d) => d.timescale_id === timescale_id)) {
    throw render(404, "Timescale not found");
  }

  return { res, intervals, referenceIntervals, id: timescale_id };
}
