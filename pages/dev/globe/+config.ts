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
  scripts: ["/cesium/Cesium.js"],
  title: "Globe",
  description: "Macrostrat Globe",
  pageStyle: "fullscreen",
};
