/* This might be a really dumb way to do this, but it works for now */
export async function onBeforeRender(pageContext) {
  return {
    pageContext: {
      pageProps: {},
    },
  };
}
