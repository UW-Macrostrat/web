import h from "@macrostrat/hyper";
import { usePageContext } from "vike-react/usePageContext";

export default function Head() {
  const ctx = usePageContext();
  const environment = ctx.globalContext.environment;

  const { scripts = [] } = ctx.config;

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
    h("link", {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/favicon-32x32.png",
    }),
    h("link", {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "/favicon-16x16.png",
    }),
    h("link", {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: "/apple-touch-icon.png",
    }),
    h("link", { rel: "manifest", href: "/site.webmanifest" }),
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
