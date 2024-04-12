export async function onBeforeRender(pageContext) {

  const pageProps = {
    user: pageContext.user
  };
  return {
    pageContext: {
      pageProps,
    },
  };
}
