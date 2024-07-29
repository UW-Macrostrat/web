export const getMapSources = async (page, pageSize) => {
  const url = new URL(window.location.origin + "/cdr/v1/tiles/sources");
  url.searchParams.set("page_size", pageSize);
  url.searchParams.set("page", page);
  const res = await fetch(url);
  const data = await res.json();
  const nullFilteredData = data.filter((source) => source.web_geom !== null);
  return nullFilteredData;
};
