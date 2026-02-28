export function title(pageContext) {
  const { data } = pageContext;
  const { map } = data;
  return map.properties.name;
}
