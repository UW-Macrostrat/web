import { ingestPrefix } from "@macrostrat-web/settings";

export async function data(pageContext) {
  const pageProps = {
    user: pageContext.user,
    ingest_api: ingestPrefix,
  };
  return {
    pageContext: {
      pageProps,
    },
  };
}
