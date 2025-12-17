import { postgrestPrefix } from "@macrostrat-web/settings";

export async function data(pageContext) {
  const pageProps = {
    user: pageContext.user,
    ingest_api: postgrestPrefix,
  };
  return {
    pageContext: {
      pageProps,
    },
  };
}
