
export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  const url = `${import.meta.env.VITE_MACROSTRAT_API_DOMAIN}/api/pg/`

  const pageProps = { swaggerUrl: url };
  return {
    pageContext: {
      pageProps,
    },
  };
}
