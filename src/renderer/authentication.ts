import {
  BaseAuthProvider,
  AuthAction,
  AsyncAuthAction,
} from "@macrostrat/auth-components";
import h from "@macrostrat/hyper";

async function authTransformer(
  action: AuthAction | AsyncAuthAction
): Promise<AuthAction | null> {
  /** This transformer is taken directly from Sparrow */
  switch (action.type) {
    case "get-status":
      // Right now, we get login status from the
      // /auth/refresh endpoint, which refreshes access
      // tokens allowing us to extend our session.
      // It could be desirable for security (especially
      // when editing information becomes a factor) to
      // only refresh tokens when access is proactively
      // granted by the application.
      return null;
    case "login":
      return null;
    case "logout":
      return null;
    default:
      return action;
  }
}

export function AuthProvider(props) {
  return h(BaseAuthProvider, { ...props, transformer: authTransformer });
}
