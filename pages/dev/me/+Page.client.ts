import h from "@macrostrat/hyper";
import { DocumentationPage } from "~/layouts";
import { AuthStatus } from "@macrostrat/auth-components";

export function Page() {
  return h(DocumentationPage, { title: "Login" }, [h(AuthStatus)]);
}
