export default function title(pageContext) {
  const { pageName } = pageContext.config;
  if (pageName != null) {
    return pageName + " – Macrostrat";
  }
  return "Macrostrat";
}
