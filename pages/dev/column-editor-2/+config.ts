export default {
  // The hybrid content/map frame (`~/layouts/hybrid`): the column and its
  // editing sheet are the content, the navigation map and column summary ride
  // alongside.
  pageStyle: "hybrid",
  title: "Column editor 2",
  description:
    "Experimental column editor: units and surfaces edited side by side.",
  meta: {
    Page: {
      env: { client: true, server: false },
    },
    data: {
      env: { client: true, server: false },
    },
  },
};
