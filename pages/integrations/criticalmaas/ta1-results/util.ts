export async function getMapSources(baseURL, page) {
  const url = new URL(baseURL + "/cdr/v1/tiles/sources");
  url.searchParams.set("page_size", 20);
  url.searchParams.set("page", page);
  console.log(url);
  const res = await fetch(url);
  return await res.json();
}
//
// export async function data(pageContext): Promise<any> {
//   const baseURL = pageContext.urlParsed.origin;
//   const sources = await getMapSources(baseURL, 0);
//
//   return { sources };
// }
