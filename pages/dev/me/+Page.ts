import h from "@macrostrat/hyper";
import { DocumentationPage } from "~/layouts";
import { AuthStatus, useAuth } from "@macrostrat/form-components";
import { useAPIResult } from "@macrostrat/ui-components";
import { postgrestPrefix } from "@macrostrat-web/settings";

export function Page() {
  return h([h(UserIdentity), h(UserIdentityPostgrest), h(AuthStatus)]);
}

function UserIdentity() {
  const { user } = useAuth();

  return h("div", [
    h("h3", "User Identity"),
    h("pre", JSON.stringify(user, null, 2)),
  ]);
}

function UserIdentityPostgrest() {
  const res = useAPIResult(`${postgrestPrefix}/rpc/auth_status`);

  if (res == null) {
    return h("div", "No Postgrest auth status");
  }

  return h("div", [
    h("h3", "User identity (PostgREST)"),
    h("pre", JSON.stringify(res?.token, null, 2)),
  ]);
}
