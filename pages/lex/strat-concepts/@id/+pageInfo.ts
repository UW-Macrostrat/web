export function pageInfo(pageContext: any) {
  const { data } = pageContext;
  const { resData } = data;
  return { name: resData.name, identifier: resData.concept_id };
}
