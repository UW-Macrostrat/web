export default {
  meta: {
    Page: {
      env: {
        client: true,
        server: false,
      },
    },
  },
  clientRouting: false,
  documentProps: {
    scripts: ["/cesium/Cesium.js"],
    title: "Macrostrat – Globe",
  },
};
