import { apiDomain } from "@macrostrat-web/settings";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  const url = `${apiDomain}/api/pg/`;

  const pageProps = { swaggerUrl: url };
  return {
    pageContext: {
      pageProps,
    },
  };
}
