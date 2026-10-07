export function pageInfo(pageContext) {
  const boundary = pageContext.data?.boundary;
  const name = boundary?.name ?? pageContext.routeParams?.slug;
  return {
    name: `Boundary: ${name}`,
    shortName: "Boundary",
  };
}
