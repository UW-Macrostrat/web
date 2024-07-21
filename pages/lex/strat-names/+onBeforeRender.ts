import {
  fetchStratNames,
  FilterState,
  defaultFilterState,
} from "./data-service";

export async function onBeforeRender(pageContext) {
  // Get filters from query string
  const { search } = pageContext.urlParsed;

  const search_ = new URLSearchParams(search);

  const filters: FilterState = {
    match: search_.get("match"),
    candidates: search_.get("candidates") === "true",
  };

  const data = await fetchStratNames(filters);

  const pageProps = { data, filters };
  return {
    pageContext: {
      pageProps,
    },
  };
}
