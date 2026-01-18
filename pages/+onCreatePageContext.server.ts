// Auth imports
import * as jose from "jose";
import { PageContextServer } from "vike/types";

// This hook is called upon new incoming HTTP requests
export async function onCreatePageContext(pageContext: PageContextServer) {
  // Get user name from cookies
  const cookies = getCookies(pageContext.headers);
  pageContext.user = await getUserFromCookie(cookies);
}

async function getUserFromCookie(cookies: Record<string, string>) {
  // Pull out the authorization cookie and decrypt it
  let user: any = null;
  try {
    const authCookie = cookies?.["access_token"];
    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    const jwt = authCookie.substring(7, authCookie.length);
    let res = await jose.jwtVerify(jwt, secret);
    user = res.payload;
    return user;
  } catch (e) {
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
