import { renderPage } from "vike/server";

// Auth imports
import * as jose from "jose";
import { PageContextBuiltInServer, PageContextServer } from "vike/types";
import { Request } from "express";

// Synthesize the config from the environment at runtime
const environment = synthesizeConfigFromEnvironment();

export async function vikeHandler<
  Context extends Record<string | number | symbol, unknown>
>(
  request: Request,
  context?: PageContextBuiltInServer<any>
): Promise<Response> {
  const cookies = getCookies(request);
  const user = await getUserFromCookie(cookies);

  const pageContextInit: PageContextServer = {
    ...context,
    urlOriginal: request.url,
    environment,
    user,
    macrostratLogoFlavor: macrostratLogoFlavor(),
    clientIPAddress: request.ip,
  };

  const pageContext = await renderPage(pageContextInit);
  const response = pageContext.httpResponse;

  const { readable, writable } = new TransformStream();

  response?.pipe(writable);

  return new Response(readable, {
    status: response?.statusCode,
    headers: response?.headers,
  });
}

async function getUserFromCookie(cookies: Record<string, string>) {
  // Pull out the authorization cookie and decrypt it
  let user: any = null;
  try {
    const authHeader = cookies?.["access_token"];
    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    const jwt = authHeader.substring(7, authHeader.length);
    let res = await jose.jwtVerify(jwt, secret);
    user = res.payload;
    console.log("User", user);
  } catch (e) {
    // If it fails, the user isn't logged in. Could also have an expired token...
    console.log("Anonymous user");
  }

  return user;
}

function getCookies(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split("; ").reduce((acc, cookie) => {
    const [key, value] = cookie.split("=");
    acc[key] = value.replace(/"/g, "");
    return acc;
  }, {});
}

function synthesizeConfigFromEnvironment() {
  /** Creates a mapping of environment variables that start with VITE_,
   * and returns them as an object. This allows us to pass environment
   * variables to the client at runtime.
   *
   * TODO: Ideally this would be defined in a library.
   * */
  const env = {};
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("VITE_")) {
      let newKey = key.substring(5);
      env[newKey] = process.env[key];
    }
  }
  return env;
}

function macrostratLogoFlavor() {
  const flavors = [
    "sandstone",
    "shale",
    "limestone",
    "granite",
    "basalt",
    "gabbro",
    "dolomite",
  ];
  // Generate a Random logo
  const random = Math.random();
  return flavors[Math.floor(random * flavors.length)];
}
