export async function data(pageContext): Promise<any> {
  const baseURL = pageContext.urlParsed.origin;

  // Fetch data from local api
  const url = new URL(`${baseURL}/cdr/v1/tiles/sources`);
  url.searchParams.set("page_size", "10");
  url.searchParams.set("page", "0");
  const res = await fetch(url);
  const data = await res.json();

  const nullFilteredData = data.filter((source) => source.web_geom !== null);

  return { sources: nullFilteredData };
}
