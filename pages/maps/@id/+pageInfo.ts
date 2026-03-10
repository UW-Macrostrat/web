export function pageInfo(pageContext) {
  const { data } = pageContext;
  const { mapInfo } = data;
  return {
    shortName: mapInfo.name,
    name: mapInfo.name,
    identifier: mapInfo.source_id,
  };
}
