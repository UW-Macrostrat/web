/** The standard sign-in page.
 *
 * Guards send anonymous visitors here (`requireLogin` in `~/_utils/auth-guards`)
 * with `?return_url=` naming the page they asked for, so the prompt can say
 * what signing in is for and bring them back there. It is also a plain
 * destination for a "Sign in" link. A visitor who is already signed in is told
 * so and offered the way on, rather than a second sign-in.
 */
import hyper from "@macrostrat/hyper";
import { AnchorButton, Callout } from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import { usePageContext } from "vike-react/usePageContext";
import type { ReactNode } from "react";
import { DocumentationPage } from "~/layouts";
import { displayName, LoginPrompt, UserPersona } from "~/components/auth";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** Only a same-origin path is honored, so the page can't be used to bounce a
 * visitor to another site after they sign in. */
function returnPath(pageContext: any): string | null {
  const raw = pageContext?.urlParsed?.search?.return_url;
  if (typeof raw !== "string" || raw === "") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

const accountTools = [
  { href: "/dashboard", name: "Your dashboard" },
  { href: "/maps/ingestion", name: "Map ingestion" },
  { href: "/columns", name: "Column editing" },
];

export function Page() {
  const pageContext = usePageContext();
  const { user } = useAuth();
  const returnURL = returnPath(pageContext);

  let body: ReactNode;
  if (user != null) {
    body = h(SignedIn, { user, returnURL });
  } else {
    body = h(LoginPrompt, {
      returnURL: returnURL ?? "/dashboard",
      title: "Sign in to Macrostrat",
      description: h(Reason, { returnURL }),
      actions: h(
        AnchorButton,
        { large: true, minimal: true, href: "/" },
        "Not now"
      ),
    });
  }

  return h(DocumentationPage, { className: "login-page" }, [
    body,
    h("div.account-tools", [
      h("h3", "What an account is for"),
      h("p", [
        "Most of Macrostrat is open to everyone. Signing in is needed for the ",
        "tools that change data, and for your own dashboard:",
      ]),
      h(
        "ul",
        accountTools.map((d) => h("li", h("a", { href: d.href }, d.name)))
      ),
    ]),
  ]);
}

function Reason({ returnURL }: { returnURL: string | null }) {
  let target: ReactNode = null;
  if (returnURL != null) {
    target = h("p", [
      "The page you asked for, ",
      h("code", returnURL),
      ", needs you to be signed in. You'll be returned there afterwards.",
    ]);
  }
  return h([
    target,
    h("p", [
      "Macrostrat uses your ",
      h("a", { href: "https://orcid.org", target: "_blank" }, "ORCID iD"),
      " to sign you in; an account is created the first time you do.",
    ]),
  ]);
}

function SignedIn({ user, returnURL }) {
  let onward: ReactNode = h(
    AnchorButton,
    { intent: "primary", icon: "dashboard", href: "/dashboard" },
    "Go to your dashboard"
  );
  if (returnURL != null) {
    onward = h(
      AnchorButton,
      { intent: "primary", icon: "arrow-right", href: returnURL },
      `Continue to ${returnURL}`
    );
  }
  return h(
    Callout,
    { className: "signed-in", intent: "success", icon: "user" },
    [
      h("p", ["You're signed in as ", h("strong", displayName(user)), "."]),
      h("div.signed-in-actions", [onward, h(UserPersona, { minimal: false })]),
    ]
  );
}
