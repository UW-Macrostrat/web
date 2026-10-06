export function pageInfo(pageContext) {
  const { mapInfo } = pageContext.data;
  return {
    name: "Correlation of units",
    shortName: `Correlation of units – ${mapInfo.name}`,
  };
}
