/** The signed-in user's dashboard.
 *
 * Grown from the old `/dev/me` diagnostic page (which now redirects here): the
 * profile the account holds, the ORCID record it is tied to, the role this
 * session carries, and the way out — logging out, restoring a degraded role,
 * or, for administrators, the admin tools. Signed out, it is the sign-in
 * prompt; there is no guard.
 */
import hyper from "@macrostrat/hyper";
import {
  AnchorButton,
  Button,
  Card,
  Icon,
  Intent,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import { DataField } from "@macrostrat/data-components";
import type { ReactNode } from "react";
import {
  accountRole,
  DegradedNotice,
  displayName,
  isAdminAccount,
  LoginPrompt,
  orcidURL,
  roleLabel,
  RoleTags,
  type SessionUser,
  useLogout,
  useUserRecord,
} from "~/components/auth";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  const { user } = useAuth();

  let body: ReactNode;
  if (user == null) {
    body = h(LoginPrompt, {
      returnURL: "/dashboard",
      title: "Sign in to see your dashboard",
    });
  } else {
    body = h(Dashboard, { user });
  }

  return h("div.dashboard-page", body);
}

function Dashboard({ user }: { user: SessionUser }) {
  // The claims in the cookie name the user; the stored record fills in the
  // rest (full name, email, when the account was created).
  const { record, loading, error } = useUserRecord();
  const profile: SessionUser = { ...user, ...(record ?? {}) };

  return h("div.dashboard", [
    h(DegradedNotice, { user: profile, compact: false }),
    h("div.dashboard-grid", [
      h(ProfileCard, { user: profile, loading, error }),
      h(SessionCard, { user: profile }),
    ]),
    h(ToolsCard, { user: profile }),
  ]);
}

function ProfileCard({ user, loading, error }) {
  const orcid = orcidURL(user.sub);

  let orcidNode: ReactNode = null;
  if (orcid != null) {
    orcidNode = h("a", { href: orcid, target: "_blank", rel: "noopener" }, [
      h(Icon, { icon: "id-number", size: 12 }),
      " ",
      user.sub,
    ]);
  }

  let status: ReactNode = null;
  if (loading) status = h(Spinner, { size: 16 });
  if (error != null) {
    status = h(
      Tag,
      { minimal: true, intent: Intent.WARNING, title: error },
      "Profile details unavailable"
    );
  }

  return h(Card, { className: "profile-card" }, [
    h("div.card-header", [
      h(Icon, { icon: "user", size: 24 }),
      h("h2", displayName(user)),
      status,
    ]),
    h("div.profile-details", [
      h(DataField, { row: true, label: "Name", value: user.name }),
      h(DataField, { row: true, label: "Email", value: user.email }),
      h(DataField, { row: true, label: "ORCiD", value: orcidNode }),
      h(DataField, {
        row: true,
        label: "Account role",
        value: h(Tag, { minimal: true }, roleLabel(accountRole(user))),
      }),
      h(DataField, {
        row: true,
        label: "Member since",
        value: formatDate(user.created_on),
      }),
    ]),
  ]);
}

function SessionCard({ user }: { user: SessionUser }) {
  const logout = useLogout();

  let adminLink: ReactNode = null;
  if (isAdminAccount(user)) {
    adminLink = h(
      AnchorButton,
      { icon: "wrench", href: "/dashboard/admin" },
      "Admin tools"
    );
  }

  return h(Card, { className: "session-card" }, [
    h("div.card-header", [
      h(Icon, { icon: "key", size: 24 }),
      h("h2", "Session"),
    ]),
    h(DataField, { row: true, label: "Role", value: h(RoleTags, { user }) }),
    h("div.session-actions", [
      adminLink,
      h(
        Button,
        { icon: "log-out", intent: Intent.DANGER, onClick: logout },
        "Log out"
      ),
    ]),
  ]);
}

const tools = [
  {
    href: "/maps/ingestion",
    icon: "map",
    name: "Map ingestion",
    description: "Review and process incoming geologic maps.",
  },
  {
    href: "/columns",
    icon: "th",
    name: "Columns",
    description: "Browse stratigraphic columns; edit the ones you can.",
  },
  {
    href: "/dev/column-editor",
    icon: "edit",
    name: "Column editor",
    description: "The legacy editor for units and sections.",
  },
];

function ToolsCard({ user }: { user: SessionUser }) {
  return h(Card, { className: "tools-card" }, [
    h("div.card-header", [
      h(Icon, { icon: "applications", size: 24 }),
      h("h2", "Tools"),
    ]),
    h(
      "ul.tool-list",
      tools.map((tool) =>
        h("li", { key: tool.href }, [
          h(Icon, { icon: tool.icon as any }),
          h("div", [
            h("a", { href: tool.href }, tool.name),
            h("div.muted", tool.description),
          ]),
        ])
      )
    ),
  ]);
}

function formatDate(value: string | null | undefined): string | null {
  if (value == null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
