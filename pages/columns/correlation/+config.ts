export default {
  meta: {
    Page: {
      /* Ideally we'd make it so only the column inset map was rendered client-side,
      but this will work for now.
      */
      env: {
        client: true,
        server: false,
      },
    },
  },
  pageInfo: {
    name: "Correlation chart",
  },
  // The hybrid content/map frame (`~/layouts/hybrid`): the chart is the
  // content, the correlation map an inset or sidebar card.
  pageStyle: "hybrid",
};
