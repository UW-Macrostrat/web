export const getMapSources = async (page, pageSize) => {
  const url = new URL("http://localhost:3003/tiles/sources");
  url.searchParams.set("page_size", pageSize);
  url.searchParams.set("page", page);
  const res = await fetch(url);
  const data = await res.json();
  return data;
};
