export function pageInfo(pageContext: any) {
  return {
    name: pageContext.data.resData.name,
    identifier: pageContext.data.resData.id,
  };
}
