import {
  BaseAuthProvider,
  AuthAction,
  AsyncAuthAction,
} from "@macrostrat/auth-components";
import h from "@macrostrat/hyper";
import { ingestPrefix } from "@macrostrat-web/settings";

async function authTransformer(
  action: AuthAction | AsyncAuthAction
): Promise<AuthAction | null> {
  /** This transformer is taken directly from Sparrow */
  switch (action.type) {
    case "get-status":
      try {
        const user = await fetchUser();
        return { type: "update-user", user };
      } catch (error) {
        return { type: "update-status", payload: { error } };
      }
    case "login":
      // Assemble the return URL on click based on the current page
      const return_url = window.location.origin + window.location.pathname;
      window.location.href = `${ingestPrefix}/security/login?return_url=${return_url}`;
    case "logout":
      // Delete the token from the session
      try {
        const response = await fetch(
          `${ingestPrefix}/security/logout`,
          { method: "POST", credentials: "include"}
        );
        if(response.ok){
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

export function AuthProvider(props) {
  return h(BaseAuthProvider, {
    ...props,
    transformer: authTransformer,
    userIdentity(user) {
      return h("code", JSON.stringify(user));
    },
  });
}

export async function fetchUser() {
  const response = await fetch(`${ingestPrefix}/security/me`, {
    method: "GET",
    credentials: "include"
  });
  if(response.ok){
    const user = await response.json();
    return user
  } else {
    throw new Error("Failed to get user status");
  }
}