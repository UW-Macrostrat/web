/** The signed-in user's dashboard.
 *
 * Grown from the old `/dev/me` diagnostic page (which now redirects here): the
 * profile the account holds, the ORCID record it is tied to, the role this
 * session carries, and the way out — logging out, restoring a degraded role,
 * or, for administrators, the admin tools. Signed out, it is the sign-in
 * prompt; there is no guard, so the page itself explains what it is for.
 */
import hyper from "@macrostrat/hyper";
import {
  AnchorButton,
  Button,
  Callout,
  Card,
  Icon,
  Intent,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import type { ReactNode } from "react";
import { DocumentationPage } from "~/layouts";
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
  sessionRole,
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

  return h(DocumentationPage, { className: "dashboard-page" }, [
    h(EarlyDevelopmentNotice),
    body,
  ]);
}

function EarlyDevelopmentNotice() {
  return h(
    Callout,
    { className: "early-development", intent: Intent.PRIMARY, icon: "build" },
    [
      h("strong", "Early days. "),
      "Macrostrat accounts are new, and this dashboard is the first thing ",
      "built on them. Expect it to grow — and to change.",
    ]
  );
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

  let orcidNode: ReactNode = h("span.muted", "none");
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
    h("dl.profile-details", [
      h(Detail, { label: "Name", value: user.name }),
      h(Detail, { label: "Email", value: user.email }),
      h(Detail, { label: "ORCID iD", value: orcidNode }),
      h(Detail, {
        label: "Account role",
        value: h(Tag, { minimal: true }, roleLabel(accountRole(user))),
      }),
      h(Detail, { label: "Member since", value: formatDate(user.created_on) }),
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
    h("p.session-role", [
      "This browser session acts as ",
      h(RoleTags, { user }),
    ]),
    h("p.muted", [
      "Data requests carry the ",
      h("code", sessionRole(user)),
      " role to the database, which decides what you can read and change.",
    ]),
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
      h("h2", "Tools that use your account"),
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

function Detail({ label, value }: { label: string; value: ReactNode }) {
  let shown: ReactNode = value;
  if (value == null || value === "") shown = h("span.muted", "—");
  return h([h("dt", label), h("dd", shown)]);
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
