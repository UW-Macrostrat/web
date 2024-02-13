import { fetchStratNames, FilterState } from "./data-service";

const defaultFilterState: FilterState = {
  match: "",
  candidates: false,
};

export async function onBeforeRender(pageContext) {
  // Get filters from query string
  const filters = defaultFilterState;

  const data = await fetchStratNames(filters);

  const pageProps = { data, filters };
  return {
    pageContext: {
      pageProps,
    },
  };
}
