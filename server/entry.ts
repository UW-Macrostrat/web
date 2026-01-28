import express from "express";
import { apply, serve } from "@photonjs/express";

function startServer() {
  const app = express();
  apply(app);
  return serve(app);
}

export default startServer();
