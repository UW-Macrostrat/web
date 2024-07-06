import hyper from "@macrostrat/hyper";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { usePageProps } from "~/renderer";

export function Page() {
  const { swaggerUrl } = usePageProps();
  return hyper(SwaggerUI, { url: swaggerUrl });
}
