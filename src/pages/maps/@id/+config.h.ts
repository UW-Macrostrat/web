import MapInterface from "./map-interface";

export default {
  Page: MapInterface,
  meta: {
    Page: {
      env: {
        client: true,
        server: false,
      },
    },
  },
};
