import { renderPage } from "vike/server";

// Auth imports
import * as jose from "jose";

// Synthesize the config from the environment at runtime
const environment = synthesizeConfigFromEnvironment();

export async function vikeHandler<
  Context extends Record<string | number | symbol, unknown>
>(request: Request, context?: Context): Promise<Response> {
  const user = await getUserFromCookie(request);

  // We add some custom instrumentation to the page context
  // to adjust titles, etc.
  console.log(context);

  const pageContextInit = {
    ...context,
    urlOriginal: request.url,
    environment,
    user,
    macrostratLogoFlavor: macrostratLogoFlavor(),
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

async function getUserFromCookie(request: Request) {
  const isProduction = process.env.NODE_ENV === "production";
  // Pull out the authorization cookie and decrypt it
  let user: any = undefined;
  try {
    const authHeader = request.cookies?.Authorization;
    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    const jwt = authHeader.substring(7, authHeader.length);
    // We probably don't need to verify the JWT on each request
    user = (await jose.jwtVerify(jwt, secret)).payload;
  } catch (e) {
    // I don't care if it fails, it just means the user isn't logged in
  }

  if (!isProduction && process.env.DEV_ENABLE_AUTH !== "true") {
    // Haha wow this is sketchy...this needs to be stopped.
    user = { groups: [1] };
  }
  return user;
}

function synthesizeConfigFromEnvironment() {
  /** Creates a mapping of environment variables that start with VITE_,
   * and returns them as an object. This allows us to pass environment
   * variables to the client.
   *
   * TODO: Ideally this would be defined in library code.
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
