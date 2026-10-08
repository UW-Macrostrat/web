import hyper from "@macrostrat/hyper";
import {
  AnchorButton,
  Button,
  Callout,
  Divider,
  Icon,
  Intent,
  PopoverNext,
  Tag,
} from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import classNames from "classnames";
import type { ReactNode } from "react";
import { SignInButton } from "./login-prompt";
import { useAssumeRole, useLogout } from "./session";
import {
  accountRole,
  displayName,
  isAdminAccount,
  isDegraded,
  orcidURL,
  roleLabel,
  type SessionUser,
  sessionRole,
} from "./user";
import styles from "./auth.module.sass";

const h = hyper.styled(styles);

export interface UserPersonaProps {
  /** Icon only; no name. For a crowded toolbar. */
  compact?: boolean;
  minimal?: boolean;
  large?: boolean;
  className?: string;
}

/**
 * The standard sign-in indicator for a page's header or toolbar.
 *
 * Signed out it reads "Sign in"; signed in it shows the user's name (or just
 * the icon, in `compact` mode) — never a bare "logged in". Yellow means the
 * session is *degraded*: an admin browsing with a lesser role. Clicking opens
 * a panel with the abbreviated profile and the ways out: the dashboard, the
 * admin tools, restoring the role, logging out.
 */
export function UserPersona({
  compact = false,
  minimal = true,
  large = false,
  className,
}: UserPersonaProps) {
  const { user } = useAuth();
  const signedIn = user != null;
  const degraded = isDegraded(user);

  let icon: "user" | "blocked-person" = "blocked-person";
  let intent: Intent = Intent.NONE;
  let text: string | null = compact ? null : "Sign in";
  let title = "Not signed in";
  if (signedIn) {
    icon = "user";
    text = compact ? null : displayName(user);
    title = `Signed in as ${displayName(user)}`;
  }
  if (degraded) {
    intent = Intent.WARNING;
    title += ` (browsing as ${sessionRole(user)})`;
  }

  return h(
    PopoverNext,
    {
      content: h(UserPanel, { user }),
      placement: "bottom-end",
      minimal: true,
      popoverClassName: "user-persona-popover",
    },
    h(Button, {
      className: classNames("user-persona", className, { degraded }),
      icon,
      intent,
      minimal,
      large,
      text,
      title,
      "aria-label": title,
    })
  );
}

function UserPanel({ user }: { user: SessionUser | null }) {
  if (user == null) return h(SignedOutPanel);
  return h(SignedInPanel, { user });
}

function SignedOutPanel() {
  return h("div.user-panel", [
    h("div.user-panel-header", [
      h(Icon, { icon: "blocked-person", size: 20 }),
      h("div.user-panel-identity", [
        h("div.user-panel-name", "Not signed in"),
      ]),
    ]),
    h("div.user-panel-actions", [h(SignInButton, { large: false })]),
  ]);
}

function SignedInPanel({ user }: { user: SessionUser }) {
  const logout = useLogout();
  const orcid = orcidURL(user.sub);

  let orcidLink: ReactNode = null;
  if (orcid != null) {
    orcidLink = h(
      "a.user-panel-detail",
      { href: orcid, target: "_blank", rel: "noopener" },
      [h(Icon, { icon: "id-number", size: 12 }), " ", user.sub]
    );
  }

  let adminLink: ReactNode = null;
  if (isAdminAccount(user)) {
    adminLink = h(
      AnchorButton,
      { minimal: true, icon: "wrench", href: "/dashboard/admin" },
      "Admin tools"
    );
  }

  return h("div.user-panel", [
    h("div.user-panel-header", [
      h(Icon, { icon: "user", size: 20 }),
      h("div.user-panel-identity", [
        h("div.user-panel-name", displayName(user)),
        orcidLink,
        h(RoleTags, { user }),
      ]),
    ]),
    h(DegradedNotice, { user }),
    h(Divider),
    h("div.user-panel-actions", [
      h(
        AnchorButton,
        { minimal: true, icon: "dashboard", href: "/dashboard" },
        "Dashboard"
      ),
      adminLink,
      h(
        Button,
        { minimal: true, icon: "log-out", intent: "danger", onClick: logout },
        "Log out"
      ),
    ]),
  ]);
}

/** The role the session acts with, and the account's own if that differs. */
export function RoleTags({ user }: { user: SessionUser | null | undefined }) {
  const role = sessionRole(user);
  const degraded = isDegraded(user);
  let intent: Intent = Intent.NONE;
  if (role === "web_authorized") intent = Intent.SUCCESS;
  if (role === "web_admin") intent = Intent.PRIMARY;
  if (degraded) intent = Intent.WARNING;

  let account: ReactNode = null;
  if (degraded) {
    account = h(
      Tag,
      { minimal: true, title: "The role your account holds" },
      `account: ${roleLabel(accountRole(user))}`
    );
  }
  return h("div.role-tags", [
    h(Tag, { minimal: true, intent, title: "The role this session carries" }, [
      roleLabel(role),
      " ",
      h("code", role),
    ]),
    account,
  ]);
}

/**
 * Shown while an admin is browsing with a lesser role, with the way back.
 * Logging out also restores the role, as does the session's next refresh.
 */
export function DegradedNotice({
  user,
  compact = true,
}: {
  user: SessionUser | null | undefined;
  compact?: boolean;
}) {
  const { assume, busy, error } = useAssumeRole();
  if (!isDegraded(user)) return null;

  let errorNode: ReactNode = null;
  if (error != null) errorNode = h("p.error", error);

  return h(
    Callout,
    {
      className: classNames("degraded-notice", { compact }),
      intent: Intent.WARNING,
      icon: "eye-open",
      compact,
      title: compact ? undefined : "Browsing with a reduced role",
    },
    [
      h("p", [
        "This session acts as ",
        h("code", sessionRole(user)),
        "; your account holds ",
        h("code", accountRole(user)),
        ".",
      ]),
      errorNode,
      h(
        Button,
        {
          small: compact,
          intent: Intent.WARNING,
          icon: "reset",
          loading: busy,
          onClick: () => assume(null),
        },
        "Restore role"
      ),
    ]
  );
}
