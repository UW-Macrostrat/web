import { postgrest } from "~/providers";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  // Fetch data from local api
  const url = `http://localhost:3000/tiles/sources`
  const res = await fetch(url)

  return {
    pageContext: {
      pageProps : {
        sources: await res.json()
      }
    },
  };
}
