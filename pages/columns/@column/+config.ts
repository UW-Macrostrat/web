export default {
  // The hybrid content/map frame (`~/layouts/hybrid`): the column is the
  // content, with the navigation map and column/unit details alongside.
  pageStyle: "hybrid",
  meta: {
    Page: {
      env: {
        client: true, // This page will be rendered on the client
        server: false, // No server-side rendering for this page
      },
    },
    data: {
      env: {
        client: true, // Data is available on the client
        server: false, // No server-side data fetching
      },
    },
  },
};
