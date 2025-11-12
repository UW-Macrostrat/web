import express from "express";
import { apply } from "vike-server/express";
import { serve } from "vike-server/express/serve";

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";

import { createMacrostratQlrAPI } from "@macrostrat-web/qgis-integration";
import sirv from "sirv";
import chalk from "chalk";
import { isBrowser } from "vike/dist/utils/isBrowser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
// Serve the app out of the `src` directory.
const root = resolve(join(__dirname, ".."));
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Load dotenv files. This should happen automatically via Vike, but it does not seem to be the case
//
// const envFile = join(root, ".env");
//
// console.log("Loading environment from", envFile);
//
// dotenv.config({ path: envFile });
//
// Set HMR variables
// if (process.env.HMR_DOMAIN) {
//   const hmrDomain = new URL(process.env.HMR_DOMAIN);
//   process.env.HMR_HOST = hmrDomain.hostname;
//   process.env.HMR_PROTOCOL = hmrDomain.protocol.replace(":", "");
// }
//
// const hmrPort = process.env.HMR_PORT
//   ? parseInt(process.env.HMR_PORT, 10)
//   : 24678;
// const hmrHost = process.env.HMR_HOST ?? "localhost";
// const hmrProtocol = process.env.HMR_PROTOCOL ?? "ws";
//
// const hmr = {
//   host: hmrHost,
//   port: hmrPort,
//   protocol: hmrProtocol,
// };

export default startServer();

function startServer() {
  if (isBrowser()) {
    throw new Error("Server code cannot be run in the browser");
  }

  const app = express();

  app.use(compression());

  // Assets and static files
  // Serve FGDC assets
  const fgdcPatterns = join(
    dirname(require.resolve("geologic-patterns")),
    "assets"
  );

  //
  if (isProduction) {
    app.use(sirv(`${root}/dist/client`));
    // Special case for cesium files at /cesium prefix
    // These should be copied into the client bundle but are not right now.
    // Ideally we'd be able to remove this fix.
    app.use("/cesium", sirv(`${root}/dist/cesium`));
  } else {
    // In development, we want to serve geologic patterns locally.
    // Otherwise, we'll handle this with a web server
    app.use("/assets/geologic-patterns", sirv(fgdcPatterns));

    /**
     * For localhost development: create a proxy to the API server to enable
     * API requests with the appropriate authorization cookies or headers.
     */
    const proxyDomain = process.env.MACROSTRAT_API_PROXY_DOMAIN;
    if (proxyDomain) {
      const target = proxyDomain + "/api";
      console.log("Proxying API requests to", target);
      const { createProxyMiddleware } = await import("http-proxy-middleware");
      app.use(
        "/api",
        createProxyMiddleware({
          target,
          changeOrigin: true,
          on: {
            proxyReq: (proxyReq) => {
              const parsedPath = new URL(proxyReq.path, proxyDomain);
              console.log(
                chalk.bold.green(`[${proxyReq.method}]`),
                chalk.dim(proxyDomain) +
                  parsedPath.pathname +
                  chalk.dim(parsedPath.hash) +
                  chalk.dim(parsedPath.search)
              );
            },
          },
        })
      );
    }

    // Instantiate Vite's development server and integrate its middleware to our server.
    // ⚠️ We should instantiate it *only* in development. (It isn't needed in production
    // and would unnecessarily bloat our server in production.)
    // const { devMiddleware } = await createDevMiddleware({
    //   root,
    //   viteConfig: {
    //     server: { hmr },
    //   },
    // });
    // app.use(devMiddleware);
  }

  // API layer handler: should restructure this as a middleware
  createMacrostratQlrAPI(
    app,
    "/docs/integrations/qgis/layers",
    process.env.VITE_MACROSTRAT_TILESERVER_DOMAIN,
    process.env.VITE_MACROSTRAT_INSTANCE
  );

  apply(app);
  return serve(app, { port });
}
