export function pageInfo(pageContext) {
  const { mapInfo } = pageContext.data;
  return {
    name: "Legend",
    shortName: `Legend – ${mapInfo.name}`,
  };
}
