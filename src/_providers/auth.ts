import {
  BaseAuthProvider,
  AuthAction,
  AsyncAuthAction,
} from "@macrostrat/form-components";
import h from "@macrostrat/hyper";
import { useEffect, useRef } from "react";
import { authPrefix } from "../../packages/settings";
import { isLocalTesting, mockUser } from "./localTestingAuth";
import { reload } from 'vike/client/router'


async function authTransformer(
  action: AuthAction | AsyncAuthAction
): Promise<AuthAction | null> {
  /** This transformer is taken directly from Sparrow */
  switch (action.type) {
    case "get-status":
      if (isLocalTesting()) {
        return { type: "update-user", user: mockUser };
      }
      try {
        const user = await fetchUser();
        return { type: "update-user", user };
      } catch (error) {
        return { type: "update-status", payload: { error } };
      }
    case "login":
      // Assemble the return URL on click based on the current page
      const return_url = window.location.origin + window.location.pathname;
      console.log("Returning to", return_url);
      window.location.href = `${authPrefix}/login?return_url=${return_url}`;
    case "logout":
      // Delete the token from the session
      try {
        const response = await fetch(`${authPrefix}/logout`, {
          method: "POST",
          credentials: "include",
        });
        if (response.ok) {
          return { type: "logout" };
        } else {
          throw new Error("Failed to logout");
        }
      } catch (error) {
        return { type: "update-status", payload: { error } };
      }
    default:
      return action;
  }
}

export function AuthProvider({
  canRefresh = false,
  ...props
}: {
  canRefresh?: boolean;
  [key: string]: any;
}) {
  // Silently re-authenticate on load when the server says a refresh is possible.
  useReactiveAuthRefresh(canRefresh);
  return h(BaseAuthProvider, {
    ...props,
    transformer: authTransformer,
    userIdentity(user) {
      return h("code", JSON.stringify(user));
    },
  });
}

/**
 * Silently mint a new access token from the refresh-token cookie. The browser
 * sends the refresh cookie and stores the new access cookie for us.
 */
async function refreshSession(): Promise<boolean> {
  if (isLocalTesting()) return false;
  try {
    const response = await fetch(`${authPrefix}/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// One-shot guard (survives the reload below) so a refresh that doesn't actually
// restore a usable cookie can't cause a reload loop. Reset on any healthy load.
const REFRESH_RELOAD_FLAG = "ms-auth-refresh-reloaded";

/**
 * When the server signals `canRefresh` (access token expired but a refresh
 * token is still present), silently refresh on load and, on success, do a full
 * reload.
 *
 * The reload — rather than an in-place `get-status` — is deliberate: only a
 * reload re-runs SSR and re-issues *every* client fetch (the auth UI AND
 * client-side PostgREST queries like `rpc/auth_status`) WITH the fresh cookie.
 * An in-place update can't re-run PostgREST queries that already fired on mount
 * without a cookie, so they'd stay stuck on `web_anon`.
 */
export function useReactiveAuthRefresh(canRefresh: boolean) {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!canRefresh) {
      // Healthy or anonymous load — clear the guard so a later expiry can refresh.
      sessionStorage.removeItem(REFRESH_RELOAD_FLAG);
      return;
    }
    // Already attempted this tab session: don't reload-loop if the refresh
    // didn't yield a usable cookie.
    if (sessionStorage.getItem(REFRESH_RELOAD_FLAG)) return;
    sessionStorage.setItem(REFRESH_RELOAD_FLAG, "1");

    refreshSession().then((ok) => {
      if (ok) window.location.reload();
    });
  }, [canRefresh]);
}

export async function fetchUser() {
  if (isLocalTesting()) return mockUser;
  const response = await fetch(`${authPrefix}/me`, {
    method: "GET",
    credentials: "include",
  });
  if (response.ok) {
    const user = await response.json();
    return user;
  } else {
    throw new Error("Failed to get user status");
  }
}
