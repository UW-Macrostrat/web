export function title(pageContext) {
  const { mapInfo } = pageContext.data;
  return mapInfo.name + "– Legend";
}
