export function pageName(pageContext: any) {
  const { data } = pageContext;
  const { resData } = data;
  return resData.strat_name_long;
}
