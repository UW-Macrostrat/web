import h from "./main.module.styl";
import { CenteredContentPage } from "~/layouts";
import { Link, PageHeader } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import { ClientOnly } from "vike-react/ClientOnly";
import { Spinner, Button, Card } from "@blueprintjs/core";
import { BlankImage } from "../index";
import { LinkCard } from "~/components";

export function Page() {
  const ctx = usePageContext();
  const is404 = ctx.is404;
  if (is404) {
    return h("div.error404", [
      h(BlankImage, {
        src: "https://storage.macrostrat.org/assets/web/earth-crust.jpg",
        className: "error-image",
        width: "100%",
        height: "100%",
      }),
      h("div.error-text", [
        h("h1", "404"),
        h("h2", "The rock you are looking for doesn't exist. Keep digging."),
        h("div.buttons", [
          h(
            LinkCard,
            { className: "btn", onClick: () => history.back() },
            "Go back"
          ),
          h(LinkCard, { className: "btn", href: "/" }, "Go home"),
        ]),
      ]),
    ]);
  }

  return h(CenteredContentPage, [h(PageHeader), h(PageContent)]);
}

function PageContent() {
  const ctx = usePageContext();
  const is404 = ctx.is404;
  const path = ctx.urlPathname;
  const statusCode = ctx.abortStatusCode;
  const reason = ctx.abortReason;

  if (statusCode == 401) {
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
      const res = await import("@macrostrat/form-components");
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
