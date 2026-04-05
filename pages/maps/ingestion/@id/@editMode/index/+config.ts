export default {
  // Applies to all pages
  ssr: false,
  pageStyle: "content",
  onBeforeRender: null,
  meta: {
    Page: {
      env: {
        client: true,
        server: true,
      },
    },
  },
};
