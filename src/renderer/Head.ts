import h from "@macrostrat/hyper";
import { usePageContext } from "vike-react/usePageContext";
import favicon from "./assets/favicon.png";

export default function Head() {
  const ctx = usePageContext();
  const { environment } = ctx;
  const { scripts = [] } = ctx.exports;

  return h([
    h("meta", {
      name: "viewport",
      content: "width=device-width, initial-scale=1",
    }),
    h("meta", { httpEquiv: "Content-Language", content: "en" }),
    h("meta", { name: "mobile-web-app-capable", content: "yes" }),
    h("meta", {
      name: "apple-mobile-web-app-status-bar-style",
      content: "black-translucent",
    }),
    h("meta", { charSet: "utf-8" }),
    h("link", { rel: "icon", href: favicon }),
    h("link", {
      href: "https://fonts.googleapis.com/css?family=Montserrat:400,700|Source+Sans+Pro",
      rel: "stylesheet",
    }),
    h("meta", { name: "description", content: "Macrostrat" }),
    h("script", {
      type: "text/javascript",
      dangerouslySetInnerHTML: {
        __html: `window.env = ${JSON.stringify(
          environment
        )}; window.process = {env: {NODE_ENV: "production"}};`,
      },
    }),
    scripts.map((src) => h("script", { src, type: "text/javascript" })),
  ]);
}
