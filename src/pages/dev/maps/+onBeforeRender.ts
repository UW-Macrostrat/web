import { postgrest } from "~/providers";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  const url = `http://localhost:8333/v1/tiles/sources`
  const res = await fetch(url)

  return {
    pageContext: {
      pageProps : {
        sources: await res.json()
      }
    },
  };
}
