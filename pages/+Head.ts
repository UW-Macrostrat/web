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
    h(GoogleFonts),
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

function GoogleFonts() {
  const fonts: string[] = [
    "Geologica:wght,CRSV@100..900,0",
    "Crimson+Pro:ital,wght@0,200..900;1,200..900",
    //"Maven+Pro:wght@400..900",
    //"Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000",
    //"PT+Serif:ital,wght@0,400;0,700;1,400;1,700",
    //"Spectral:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,200;1,300;1,400;1,500;1,600;1,700;1,800",
    //"Domine:wght@400..700",
  ];

  const fontStr = fonts.join("&family=");
  const href = `https://fonts.googleapis.com/css2?family=${fontStr}&display=swap`;

  return h([
    h("link", {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    }),
    h("link", {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "true",
    }),
    h("link", {
      href,
      rel: "stylesheet",
    }),
  ]);
}
