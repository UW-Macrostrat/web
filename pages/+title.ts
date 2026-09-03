export default function title(pageContext) {
  const pageName = getPageName(pageContext);
  if (pageName != null) {
    return pageName + " – Macrostrat";
  }
  return "Macrostrat";
}

function getPageName(pageContext): string | null {
  const { pageInfo } = pageContext.config;
  console.log("pageInfo", pageInfo);
  const firstPageInfoEntry = pageInfo;
  if (firstPageInfoEntry == null) return null;
  if (typeof firstPageInfoEntry === "string") return firstPageInfoEntry;
  let pageInfoEntry = null;
  if (typeof firstPageInfoEntry === "function") {
    pageInfoEntry = firstPageInfoEntry(pageContext);
  }
  if (typeof firstPageInfoEntry === "object") {
    pageInfoEntry = firstPageInfoEntry;
  }
  const res = pageInfoEntry.shortName ?? pageInfoEntry.name;
  return capitalize(res);
}

function capitalize(str: string | null) {
  if (str == null) return null;
  // A name that already carries capitals is deliberate (e.g. "xDD").
  if (/[A-Z]/.test(str)) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
