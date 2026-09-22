export default {
  // The editor runs full-width in the hybrid frame — no map, no sidebar (see
  // `editor-shell.ts`).
  pageStyle: "hybrid",
  title: "Column editor",
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
