/**
 * Server extension for looking up requester's approximate location using their
 * IP address. Used to provide a default location for the map interface if no
 * location is provided.
 */

import { Request, Application } from "express";

function getRequesterIPAddress(req: Request) {
  // A basic strategy for getting the requester's IP address.
  // We could also use a library like `request-ip`
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  if ("," in ip) {
    return ip.split(",")[0];
  }
  return ip;
}

function geoIPMiddleware(app: Application) {
  app.set("trust proxy", true);

  app.use;
}
