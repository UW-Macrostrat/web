export function pageInfo(pageContext: any) {
  const group = pageContext.data?.resData;
  return {
    name: group?.name ?? "Column group",
    identifier: group?.col_group_id,
  };
}
