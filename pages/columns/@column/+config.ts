export default {
  pageStyle: "fullscreen",
  meta: {
    page: {
      env: {
        client: true, // This page will be rendered on the client
        server: false, // No server-side rendering for this page
      },
    },
  },
};
