import { buildBreadcrumbs } from "~/_utils/breadcrumbs";

export async function onBeforeRender(pageContext) {
  // Data fetched here is available to all child routes
  console.log("onBeforeRender", pageContext.parentData);
  const parentData = (pageContext.parentData ?? []) + ["test"];
  console.log("parentData", parentData);

  const breadcrumbs = buildBreadcrumbs(pageContext);

  console.log("breadcrumbs", breadcrumbs);

  return {
    pageContext: {
      parentData,
      breadcrumbs,
    },
  };
}

//export const passToClient = true;
