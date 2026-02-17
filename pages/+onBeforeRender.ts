export async function onBeforeRender(pageContext) {
  // Data fetched here is available to all child routes
  console.log("onBeforeRender", pageContext.parentData);
  const parentData = (pageContext.parentData ?? []) + ["test"];
  console.log("parentData", parentData);
  return {
    pageContext: {
      parentData,
    },
  };
}

//export const passToClient = true;
