export default function title(pageContext) {
  const pageName = getPageName(pageContext);
  if (pageName != null) {
    return pageName + " – Macrostrat";
  }
  return "Macrostrat";
}

function getPageName(pageContext): string | null {
  const { pageInfo } = pageContext.config;
  const firstPageInfoEntry = pageInfo?.[0];
  if (firstPageInfoEntry == null) return null;
  if (typeof firstPageInfoEntry === "string") return firstPageInfoEntry;
  let pageInfoEntry = null;
  if (typeof firstPageInfoEntry === "function") {
    pageInfoEntry = firstPageInfoEntry(pageContext);
  }
  if (typeof firstPageInfoEntry === "object") {
    pageInfoEntry = firstPageInfoEntry;
  }
  return pageInfoEntry.shortName ?? pageInfoEntry.name;
}
