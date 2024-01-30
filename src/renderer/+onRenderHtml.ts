export { render as onRenderHtml };
// See https://vike.dev/data-fetching

import h from "@macrostrat/hyper";
import ReactDOMServer from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import { PageShell } from "./page-shell";
import type { PageContextServer } from "./types";

async function render(pageContext: PageContextServer) {
  const { Page, pageProps, config } = pageContext;
  // This render() hook only supports SSR, see https://vike.dev/render-modes for how to modify render() to support SPA
  let pageHtml = "";
  if (Page != null) {
    pageHtml = ReactDOMServer.renderToString(
      h(PageShell, { pageContext }, h(Page, pageProps))
    );
  }

  const { clientRouting, isolateStyles = false } = config;

  if (isolateStyles && clientRouting) {
    throw new Error(
      "Isolating styles is not allowed when using client routing"
    );
  }

  if (!isolateStyles || clientRouting) {
    await import("~/styles/blueprint-core");
    await import("../styles/_theme.styl");
    await import("../styles/core.sass");
    await import("../styles/padding.css");
  }

  // See https://vike.dev/head
  const { documentProps } = pageContext.exports;
  const title = (documentProps && documentProps.title) || "Macrostrat";
  const desc = (documentProps && documentProps.description) || "Macrostrat";

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Language" content="en" />
        <meta name="mobile-wep-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <link
          href="https://fonts.googleapis.com/css?family=Montserrat:400,700|Source+Sans+Pro"
          rel="stylesheet"
        />
        <meta name="description" content="${desc}" />
        <title>${title}</title>
      </head>
      <body>
        <!-- Workaround for Firefox flash of unstyled content -->
        <script>0</script>
        <div id="app-container">${dangerouslySkipEscape(pageHtml)}</div>
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: {
      // We can add some `pageContext` here, which is useful if we want to do page redirection https://vike.dev/page-redirection
    },
  };
}
