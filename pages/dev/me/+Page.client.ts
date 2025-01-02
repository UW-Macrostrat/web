import h from "@macrostrat/hyper";
import { DocumentationPage } from "~/layouts";
import { AuthStatus, useAuth } from "@macrostrat/auth-components";
import { usePostgresQuery } from "#/integrations/xdd/extractions/lib/data-service";

export function Page() {
  return h(DocumentationPage, { title: "Login" }, [
    h(UserIdentity),
    h(UserIdentityPostgrest),
    h(AuthStatus),
  ]);
}

function UserIdentity() {
  const { user } = useAuth();

  return h("div", [
    h("h3", "User Identity"),
    h("pre", JSON.stringify(user, null, 2)),
  ]);
}

function UserIdentityPostgrest() {
  const res = usePostgresQuery("rpc/auth_status");

  if (res == null) {
    return h("div", "No Postgrest auth status");
  }

  return h("div", [
    h("h3", "User identity (PostgREST)"),
    h("pre", JSON.stringify(res?.token, null, 2)),
  ]);
}
