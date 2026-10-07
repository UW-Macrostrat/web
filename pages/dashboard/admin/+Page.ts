/** Administrator tools: see what the system makes of a session, browse the
 * site with a reduced role, and manage users and API tokens.
 *
 * Everything that changes state goes through api_v3's admin-gated `/security`
 * routes; this page is a window onto them, not an authority of its own. A
 * degraded session (an admin browsing as `web_user`) can reach the page to
 * restore itself, but the tables stand down until it does, since the API
 * would refuse them anyway.
 */
import hyper from "@macrostrat/hyper";
import { Callout, HotkeysProvider, Intent } from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import type { ReactNode } from "react";
import { DocumentationPage } from "~/layouts";
import { isDegraded, UserPersona } from "~/components/auth";
import { IntrospectionPanel, RoleSwitchPanel } from "./introspection";
import { UsersHelp, UsersSheet } from "./users-sheet";
import { TokensHelp, TokensSheet } from "./tokens-sheet";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  const { user } = useAuth();
  const degraded = isDegraded(user);

  return h(DocumentationPage, { className: "admin-page" }, [
    h("div.admin-header", [
      h("p.muted", [
        "Tools for operating Macrostrat's user system. Everything here acts ",
        "through the API with your session, so what you can do follows the ",
        "role your session carries — shown on the persona indicator.",
      ]),
      h(UserPersona, { minimal: false }),
    ]),
    h(
      Section,
      { title: "Session", description: "Try the site with a reduced role." },
      [h(RoleSwitchPanel, { user })]
    ),
    h(
      Section,
      {
        title: "System",
        description:
          "How each layer reads the current session. They should agree.",
      },
      [h(IntrospectionPanel)]
    ),
    h(
      Section,
      {
        title: "Users",
        description: "Every account, with the role it holds.",
      },
      [
        h(AdminOnly, { degraded, what: "manage users" }, [
          h(UsersHelp),
          h(UsersSheet),
        ]),
      ]
    ),
    h(
      Section,
      {
        title: "API tokens",
        description: "Delegated tokens for services and third parties.",
      },
      [
        h(AdminOnly, { degraded, what: "manage tokens" }, [
          h(TokensHelp),
          h(TokensSheet),
        ]),
      ]
    ),
  ]);
}

function Section({ title, description, children }) {
  return h("section.admin-section", [
    h("div.section-header", [h("h2", title), h("p.muted", description)]),
    h(HotkeysProvider, children),
  ]);
}

/** The tables need an admin session; while degraded, say so instead of
 * showing a table that fails to load. */
function AdminOnly({
  degraded,
  what,
  children,
}: {
  degraded: boolean;
  what: string;
  children: ReactNode;
}) {
  if (!degraded) return h([children]);
  return h(
    Callout,
    { intent: Intent.WARNING, icon: "eye-open" },
    `Restore your role (above) to ${what}; the API refuses a web_user session.`
  );
}
