import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import proxy from "express-http-proxy";
import cookieParser from "cookie-parser";
import compression from "compression";

import { vikeHandler } from "./vike-handler";
import { createMiddleware } from "@universal-middleware/express";
import { createMacrostratQlrAPI } from "@macrostrat-web/qgis-integration";
import express from "express";
import sirv from "sirv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
// Serve the app out of the `src` directory.
const root = resolve(join(__dirname, ".."));
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const hmrPort = process.env.HMR_PORT
  ? parseInt(process.env.HMR_PORT, 10)
  : 24678;

interface Middleware<
  Context extends Record<string | number | symbol, unknown>
> {
  (request: Request, context: Context):
    | Response
    | void
    | Promise<Response>
    | Promise<void>;
}

export function handlerAdapter<
  Context extends Record<string | number | symbol, unknown>
>(handler: Middleware<Context>) {
  return createMiddleware(
    async (context) => {
      const rawRequest = context.platform.request as unknown as Record<
        string,
        unknown
      >;
      rawRequest.context ??= {};
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

startServer();

async function startServer() {
  const app = express();

  app.use(compression());
  app.use(cookieParser());
  //
  if (isProduction) {
    app.use(sirv(`${root}/dist/client`));
    // Special case for cesium files at /cesium prefix
    // These should be copied into the client bundle but are not right now.
    // Ideally we'd be able to remove this fix.
    app.use("/cesium", sirv(`${root}/dist/cesium`));
  } else {
    // Instantiate Vite's development server and integrate its middleware to our server.
    // ⚠️ We should instantiate it *only* in development. (It isn't needed in production
    // and would unnecessarily bloat our server in production.)
    const vite = await import("vite");
    const viteDevMiddleware = (
      await vite.createServer({
        root,
        server: { middlewareMode: true, hmr: { port: hmrPort } },
      })
    ).middlewares;
    app.use(viteDevMiddleware);
  }

  // API layer handler: should restructure this as a middleware
  createMacrostratQlrAPI(
    app,
    "/docs/integrations/qgis/layers",
    process.env.VITE_MACROSTRAT_TILESERVER_DOMAIN,
    process.env.VITE_MACROSTRAT_INSTANCE
  );

  // CriticalMAAS CDR integration
  // Proxy requests to /tile/* to https://api.cdr.land/v1/tiles/*
  // Add the Authorization header to the proxied request
  //
  if (process.env.CDR_API_KEY) {
    app.use(
      "/tiles",
      proxy("http://0.0.0.0:8333/", {
        proxyReqOptDecorator: (opts) => {
          opts.headers["Authorization"] = `Bearer ${process.env.CDR_API_KEY}`;
          return opts;
        },
        proxyReqPathResolver: (req) => {
          return `/v1/tiles${req.url}`;
        },
      })
    );
  }

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
