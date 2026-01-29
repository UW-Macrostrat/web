import express from "express";
import { apply, serve } from "@photonjs/express";
import sirv from "sirv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fgdcPatterns = join(
  dirname(fileURLToPath(import.meta.resolve("geologic-patterns"))),
  "assets"
);

function startServer() {
  const app = express();
  app.use("/assets/geologic-patterns", sirv(fgdcPatterns));
  apply(app);
  return serve(app);
}

export default startServer();
