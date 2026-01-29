export default {
  title: "Columns",
  pageStyle: "content",
  meta: {
    Page: {
      env: {
        client: true, // This page will be rendered on the client
        server: true, // No server-side rendering for this page
      },
    },
    data: {
      env: {
        client: true, // Data is available on the client
        server: true, // No server-side data fetching
      },
    },
  },
};
