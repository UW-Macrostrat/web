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
};
