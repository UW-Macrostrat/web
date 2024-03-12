// This file isn't processed by Vite, see https://github.com/brillout/vike/issues/562
// Consequently:
//  - When changing this file, you needed to manually restart your server for your changes to take effect.
//  - To use your environment variables defined in your .env files, you need to install dotenv, see https://vike.dev/env
//  - To use your path aliases defined in your vite.config.js, you need to tell Node.js about them, see https://vike.dev/path-aliases

import compression from "compression";
import express from "express";
import { renderPage } from "vike/server";
import { root } from "./root.js";

// Auth imports
import cookieParser from "cookie-parser";
import * as jose from "jose";

const isProduction = process.env.NODE_ENV === "production";

startServer();

const flavors = [
  "sandstone",
  "shale",
  "limestone",
  "granite",
  "basalt",
  "gabbro",
  "dolomite",
];

async function startServer() {
  const app = express();

  app.use(compression());
  app.use(cookieParser());

  // Vite integration
  if (isProduction) {
    // In production, we need to serve our static assets ourselves.
    // (In dev, Vite's middleware serves our static assets.)
    const sirv = (await import("sirv")).default;
    app.use(sirv(`${root}/dist/client`));
  } else {
    // We instantiate Vite's development server and integrate its middleware to our server.
    // ⚠️ We instantiate it only in development. (It isn't needed in production and it
    // would unnecessarily bloat our production server.)
    const vite = await import("vite");
    const viteDevMiddleware = (
      await vite.createServer({
        root,
        server: { middlewareMode: true },
      })
    ).middlewares;
    app.use(viteDevMiddleware);
  }

  // ...
  // Other middlewares (e.g. some RPC middleware such as Telefunc)
  // ...

  // vike middleware. It should always be our last middleware (because it's a
  // catch-all middleware superseding any middleware placed after it).
  app.get("*", async (req, res, next) => {
    // Pull out the authorization cookie and decrypt it
    let user = undefined;
    try {
      const authHeader = req.cookies?.Authorization;
      const secret = new TextEncoder().encode(process.env.SECRET_KEY);
      const jwt = authHeader.substring(7, authHeader.length);
      user = (await jose.jwtVerify(jwt, secret)).payload;
    } catch (e) {
      // I don't care if it fails, it just means the user isn't logged in
    }
    if(!isProduction) {
      user = {groups: [1]}
    }

    // Generate a Random logo
    const random = Math.random();
    const flavor = flavors[Math.floor(random * flavors.length)];

    const pageContextInit = {
      urlOriginal: req.originalUrl,
      user: user,
      macrostratLogoFlavor: flavor,
    };

    const pageContext = await renderPage(pageContextInit);

    const { httpResponse } = pageContext;
    if (!httpResponse) {
      return next();
    } else {
      const { body, statusCode, headers, earlyHints } = httpResponse;
      // if (res.writeEarlyHints) res.writeEarlyHints({ link: earlyHints.map((e) => e.earlyHintLink) })
      headers.forEach(([name, value]) => res.setHeader(name, value));
      res.status(statusCode);
      if (!res.hasHeader("Content-Type"))
        res.setHeader("Content-Type", "text/html");
      // For HTTP streams use httpResponse.pipe() instead, see https://vike.dev/stream
      res.send(body);
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port);
  console.log(
    `Server (${process.env.NODE_ENV}) running at http://localhost:${port}`
  );
}
