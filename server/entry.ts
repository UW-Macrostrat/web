import express from "express";
import { apply, serve } from "@photonjs/express";
import sirv from "sirv";
import { mintTileToken } from "../src/_utils/tile-token.server.ts";
import {
  mapSnapshotConfig,
  mapSnapshotDir,
} from "../src/map-snapshots/store.server.ts";
import { MAP_SNAPSHOT_URL_PREFIX } from "../src/map-snapshots/spec.ts";
import { stillColumnFor } from "../pages/index/hero-column-static.server.ts";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fgdcPatterns = join(
  dirname(fileURLToPath(import.meta.resolve("geologic-patterns"))),
  "assets"
);

function startServer() {
  const app = express();
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
  // Cached map views the server has drawn of itself. Their URLs carry
  // `?v=<renderedAt>`, so they can be cached for good; a file that isn't there
  // is a 404 here rather than a page render.
  app.use(
    MAP_SNAPSHOT_URL_PREFIX,
    express.static(mapSnapshotDir(), {
      immutable: true,
      maxAge: "365d",
      index: false,
      fallthrough: false,
    })
  );
  // The homepage hero's column as static markup, for an area the still's
  // carousel moves to (the opening one comes with the page).
  app.get("/_hero/still-column/:area", async (req, res) => {
    const column = await stillColumnFor(req.params.area);
    if (column == null) {
      res.status(404).json({ error: "No column for this area" });
      return;
    }
    res.set("Cache-Control", "public, max-age=600");
    res.json(column);
  });
  apply(app);
  warmMapSnapshots();
  return serve(app);
}

/** Ask for the homepage once the server is up, so its stills are drawn before
 * the first reader arrives rather than for the second. A request rather than a
 * direct call: the page's data hook is what knows which stills it needs. */
function warmMapSnapshots() {
  const { renderEnabled, siteURL } = mapSnapshotConfig();
  if (!renderEnabled) return;
  setTimeout(() => {
    fetch(siteURL + "/").catch((err) => {
      console.warn("[map-snapshots] warm-up request failed:", err?.message ?? err);
    });
  }, 15_000).unref();
}

export default startServer();
