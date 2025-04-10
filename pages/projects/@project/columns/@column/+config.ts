export default {
  pageStyle: "fullscreen",
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
        server: true, // Data can be fetched on the server
      },
    },
  },
};
