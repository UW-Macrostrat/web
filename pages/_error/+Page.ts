import h from "@macrostrat/hyper";
import { CenteredContentPage } from "~/layouts";
import { PageHeader } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import { ClientOnly } from "vike-react/ClientOnly";
import { Spinner, Button } from "@blueprintjs/core";

export function Page() {
  return h(CenteredContentPage, [h(PageHeader), h(PageContent)]);
}

function PageContent() {
  const ctx = usePageContext();
  const is404 = ctx.is404;
  const path = ctx.urlPathname;
  const statusCode = ctx.abortStatusCode;
  const reason = ctx.abortReason;

  if (is404) {
    return h([
      h("h1", [h("code.bp5-code", "404"), " Page Not Found"]),
      h("p", ["Could not find a page at path ", h("code.bp5-code", path), "."]),
    ]);
  } else if (statusCode == 401) {
    return h([
      h("h1", [h("code.bp5-code", "401"), " Unauthorized"]),
      h("p", [reason]),
      h(LoginButton),
    ]);
  } else {
    return h([
      h("h1", "Internal Error"),
      h("p", ["Something went wrong."]),
      h("p", ["Code: ", h("code", "500")]),
    ]);
  }
}

function LoginButton() {
  /** For now, the login button only loads on the client side */
  return h(ClientOnly, {
    load: async () => {
      const res = await import("@macrostrat/auth-components");
      return res.AuthStatus;
    },
    fallback: h(
      Button,
      {
        disabled: true,
        icon: h(Spinner, { size: 16 }),
        minimal: true,
        large: true,
      },
      "Not logged in"
    ),
    children: (component) => h(component),
  });
}
