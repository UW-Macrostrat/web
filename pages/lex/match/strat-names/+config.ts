export default {
  pageInfo: { name: "Stratigraphic name matcher" },
  title: "Stratigraphic name matcher",
  description:
    "See how a stratigraphic name resolves against Macrostrat's lexicon and columns.",
  // The form drives every request from the browser; nothing to prerender.
  meta: {
    Page: {
      env: { client: true, server: false },
    },
  },
};
