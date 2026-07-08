// Auth imports
import * as jose from "jose";
import { PageContextServer } from "vike/types";

// This hook is called upon new incoming HTTP requests
export async function onCreatePageContext(pageContext: PageContextServer) {
  // Get user name from cookies

  const cookies = getCookies(pageContext.headers);
  pageContext.user = await getUserFromCookie(cookies);
  return pageContext;
}

interface ExportData {
  value: string;
  definedAt: string;
}

// Only log each config problem once per server process to avoid spamming the
// console (this hook runs on every incoming request).
let warnedMissingSecret = false;
let warnedSecretMismatch = false;

async function getUserFromCookie(cookies: Record<string, string>) {
  // SECRET_KEY must match the value api_v3 uses to sign the auth JWT. Without
  // it the web server can't verify the token, so the user always looks logged out.
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.error(
        "[auth] SECRET_KEY is not set in the web server environment. The web " +
          "app cannot verify the auth JWT minted by api_v3, so login will not " +
          "work. Add SECRET_KEY to your web .env, set to the SAME value api_v3 " +
          "uses.",
      );
    }
    return null;
  }

  // No cookie = the user isn't logged in so no error
  const authCookie = cookies?.["access_token"];
  if (!authCookie) return null;

  try {
    const secret = new TextEncoder().encode(secretKey);
    // api_v3 stores the cookie as `Bearer <jwt>`.
    const jwt = authCookie.startsWith("Bearer ")
      ? authCookie.slice("Bearer ".length)
      : authCookie;
    const res = await jose.jwtVerify(jwt, secret);
    return res.payload;
  } catch (e: any) {
    // if there's an expired token then the user just needs to log in again.
    if (e?.code === "ERR_JWT_EXPIRED") return null;

    // A signature failure means the web SECRET_KEY doesn't match
    // the one api_v3 signed the token with.
    if (e?.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
      if (!warnedSecretMismatch) {
        warnedSecretMismatch = true;
        console.error(
          "[auth] Auth token signature verification failed — the web " +
            "SECRET_KEY does not match the SECRET_KEY api_v3 used to sign the " +
            "JWT. Set both to the same value.",
        );
      }
      return null;
    }

    console.warn("[auth] Could not verify auth token:", e?.message ?? e);
    return null;
  }
}

function getCookies(headers: Record<string, string>): Record<string, string> {
  const cookieHeader = headers["cookie"];
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split("; ").reduce((acc, cookie) => {
    const [key, value] = cookie.split("=");
    acc[key] = value.replace(/"/g, "");
    return acc;
  }, {});
}
