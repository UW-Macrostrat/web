export async function data(pageContext): Promise<any> {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  // Fetch data from local api
  const url = `http://localhost:3000/tiles/sources`;
  const res = await fetch(url);
  const data = await res.json();

  const nullFilteredData = data.filter((source) => source.web_geom !== null);

  return { sources: nullFilteredData };
}
