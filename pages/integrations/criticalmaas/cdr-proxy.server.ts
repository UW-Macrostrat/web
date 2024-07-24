// CriticalMAAS CDR integration
// Proxy requests to /tile/* to https://api.cdr.land/v1/tiles/*
// Add the Authorization header to the proxied request
//

import proxy from "express-http-proxy";

export function createCDRProxy() {
  // TODO: CDR needs to accept authentication so that we can stop proxying requests.
  // OR tile endpoints need to be public.
  const proxyAddress = process.env.CDR_API_BASE ?? "https://api.cdr.land";
  const proxyToken = process.env.CDR_API_KEY;

  if (!proxyToken || !proxyAddress) {
    return null;
  }

  return proxy(proxyAddress, {
    proxyReqOptDecorator: (opts) => {
      opts.headers["Authorization"] = `Bearer ${proxyToken}`;
      return opts;
    },
  });
}
