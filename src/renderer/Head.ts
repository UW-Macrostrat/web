import h from "@macrostrat/hyper";
import { usePageContext } from "vike-react/usePageContext";

export function Head() {
  const ctx = usePageContext();
  const { environment } = ctx;

  return h([
    h("meta", {
      name: "viewport",
      content: "width=device-width, initial-scale=1",
    }),
    h("meta", { name: "description", content: "Macrostrat" }),
    h("script", {
      type: "text/javascript",
      children: `window.env = ${JSON.stringify(
        environment
      )}; window.process = {env: {NODE_ENV: "production"}};`,
    }),
  ]);
}
