import { fetchAPIData } from "../columns/utils";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const projects = await fetchAPIData("/defs/projects", { all: true });

  return {
    pageContext: {
      pageProps: {
        projects,
      },
    },
  };
}
