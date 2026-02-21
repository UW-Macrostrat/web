export default function title(pageContext) {
  const { pageName } = pageContext.config;
  console.log("pageName", pageName?.[0]);
  const pageNameValue = pageName?.[0];
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
