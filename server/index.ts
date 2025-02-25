import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";

import { createDevMiddleware } from "vike/server";
import { vikeHandler } from "./vike-handler";
import { createMiddleware } from "@universal-middleware/express";
import { createMacrostratQlrAPI } from "@macrostrat-web/qgis-integration";
import express from "express";
import sirv from "sirv";
import chalk from "chalk";
import { getGeoIPResult } from "./geoip";
import { PageContext } from "vike/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
// Serve the app out of the `src` directory.
const root = resolve(join(__dirname, ".."));
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Set HMR variables
if (process.env.HMR_DOMAIN) {
  const hmrDomain = new URL(process.env.HMR_DOMAIN);
  process.env.HMR_HOST = hmrDomain.hostname;
  process.env.HMR_PROTOCOL = hmrDomain.protocol.replace(":", "");
}

const hmrPort = process.env.HMR_PORT
  ? parseInt(process.env.HMR_PORT, 10)
  : 24678;
const hmrHost = process.env.HMR_HOST ?? "localhost";
const hmrProtocol = process.env.HMR_PROTOCOL ?? "ws";

const hmr = {
  host: hmrHost,
  port: hmrPort,
  protocol: hmrProtocol,
};

console.log(hmr);

interface Middleware<
  Context extends Record<string | number | symbol, unknown>
> {
  (request: Request, context: Context):
    | Response
    | void
    | Promise<Response>
    | Promise<void>;
}

type BaseContext = Record<string, unknown> & {
  context: Partial<PageContext>;
};

export function handlerAdapter<
  Context extends Record<string | number | symbol, unknown>
>(handler: Middleware<Context>) {
  return createMiddleware(
    async (context) => {
      const rawRequest = context.platform.request as unknown as BaseContext;

      rawRequest.context ??= {};

      // Add the clientIPAddress to the context
      rawRequest.context.clientIPAddress = rawRequest.ip;
      const response = await handler(
        context.request,
        rawRequest.context as Context
      );

      if (!response) {
        context.passThrough();
        return new Response("", {
          status: 404,
        });
      }

      return response;
    },
    {
      alwaysCallNext: false,
    }
  );
}

startServer().then(() => {});

async function startServer() {
  const app = express();

  app.use(compression());

  // Trust the proxy to return the correct IP address
  app.set("trust proxy", true);

  // Assets and static files
  // Serve FGDC assets
  const fgdcPatterns = join(
    dirname(require.resolve("geologic-patterns")),
    "assets"
  );

  app.use("/assets/geologic-patterns", sirv(fgdcPatterns));

  //
  if (isProduction) {
    app.use(sirv(`${root}/dist/client`));
    // Special case for cesium files at /cesium prefix
    // These should be copied into the client bundle but are not right now.
    // Ideally we'd be able to remove this fix.
    app.use("/cesium", sirv(`${root}/dist/cesium`));
  } else {
    /** Route for testing GeoIP lookups */
    app.get("/test/geoip", (req, res) => {
      try {
        const geo = getGeoIPResult(req.ip);
        return res.json({ ip: req.ip, geo });
      } catch (err) {
        return res.status(404).json({ error: err.message });
      }
    });

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
    const { devMiddleware } = await createDevMiddleware({
      root,
      viteConfig: {
        server: { hmr },
      },
    });
    app.use(devMiddleware);
  }

  // API layer handler: should restructure this as a middleware
  createMacrostratQlrAPI(
    app,
    "/docs/integrations/qgis/layers",
    process.env.VITE_MACROSTRAT_TILESERVER_DOMAIN,
    process.env.VITE_MACROSTRAT_INSTANCE
  );

  /**
   * Vike route
   *
   * @link {@see https://vike.dev}
   **/
  app.all("*", handlerAdapter(vikeHandler));

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
