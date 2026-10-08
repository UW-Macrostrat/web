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
import { isDegraded } from "~/components/auth";
import { IntrospectionPanel, RoleSwitchPanel } from "./introspection";
import { UsersHelp, UsersSheet } from "./users-sheet";
import { TokensHelp, TokensSheet } from "./tokens-sheet";
import { HistorySheet } from "./history-sheet";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  const { user } = useAuth();
  const degraded = isDegraded(user);

  return h("div.admin-page", [
    h(Section, { title: "Session" }, [h(RoleSwitchPanel, { user })]),
    h(
      Section,
      {
        title: "System",
        description: "How each layer reads the current session.",
      },
      [h(IntrospectionPanel)]
    ),
    h(
      Section,
      {
        title: "Users",
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
      },
      [
        h(AdminOnly, { degraded, what: "manage tokens" }, [
          h(TokensHelp),
          h(TokensSheet),
        ]),
      ]
    ),
    h(
      Section,
      {
        title: "Recent changes",
      },
      [
        h(AdminOnly, { degraded, what: "see the audit trail" }, [
          h(HistorySheet),
        ]),
      ]
    ),
  ]);
}

function Section({
  title,
  description = null,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return h("section.admin-section", [
    h("div.section-header", [
      h("h2", title),
      h.if(description != null)("p.muted", description),
    ]),
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
    `Restore your role to ${what}.`
  );
}
