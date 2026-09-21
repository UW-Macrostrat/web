export default {
  // The picker leads with the map, so the hybrid frame's split shell is the
  // default here — the opposite of the editor it opens.
  pageStyle: "hybrid",
  title: "Column editor",
  description:
    "Pick a column to edit, or start a new one. Experimental column editor.",
  meta: {
    Page: {
      env: { client: true, server: false },
    },
  },
};
