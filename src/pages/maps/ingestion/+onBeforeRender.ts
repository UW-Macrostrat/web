import { ingestPrefix } from "@macrostrat-web/settings";

export async function onBeforeRender(pageContext) {
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
