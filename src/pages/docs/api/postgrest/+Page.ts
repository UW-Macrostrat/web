import hyper from "@macrostrat/hyper";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

const Page = ({ swaggerUrl }) => {
  return hyper(SwaggerUI, { url: swaggerUrl });
};

export default Page;
