// product/catch-all/+route.js
export default (pageContext) => {
  if (!pageContext.urlPathname.startsWith("/docs")) return false;
  return {
    precedence: -1,
    pageContext: {
      redirectTo: "/docs",
    },
  };
};
