export default function title(pageContext) {
  const { pageInfo } = pageContext.config;
  const pageNameValue = pageInfo?.[0]?.name;
  let _pageName = null;
  if (typeof pageNameValue === "string") {
    _pageName = pageNameValue;
  } else if (typeof pageNameValue === "function") {
    _pageName = pageNameValue(pageContext);
  }
  if (_pageName != null) {
    return _pageName + " – Macrostrat";
  }
  return "Macrostrat";
}
