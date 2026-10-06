import express from "express";
import { apply, serve } from "@photonjs/express";
import sirv from "sirv";
import { mintTileToken } from "../src/_utils/tile-token.server.ts";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createProxyMiddleware } from "http-proxy-middleware";

const fgdcPatterns = join(
  dirname(fileURLToPath(import.meta.resolve("geologic-patterns"))),
  "assets"
);

function startServer() {
  const app = express();
  const kgTarget = process.env.VITE_MACROSTRAT_KG_API_DOMAIN;
  if (kgTarget !== undefined && !kgTarget.startsWith("http")) {
    console.log("Proxying KG API requests to", kgTarget);
    app.use(
      "/kg-api",
      createProxyMiddleware({
        target: kgTarget,
        changeOrigin: true,
      })
    );
  }
  app.use("/assets/geologic-patterns", sirv(fgdcPatterns));
  // A fresh tile token, for a page that has outlived the one it arrived with.
  // Never cached: every response is a different credential.
  app.get("/auth/_tile-token", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    const minted = await mintTileToken();
    if (minted == null) {
      res.status(503).json({ error: "This server cannot mint tile tokens" });
      return;
    }
    const expiresIn = Math.floor((minted.expiresAt - Date.now()) / 1000);
    res.json({ token: minted.token, expires_in: expiresIn });
  });
  apply(app);
  return serve(app);
}

export default startServer();
