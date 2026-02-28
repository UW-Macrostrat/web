export function title(pageContext) {
  const { map } = pageContext.data;
  return map.name + "– Legend";
}
