/** What each layer of the system makes of the current session.
 *
 * The same cookie is read three times on every request — by the web server
 * (which verifies the JWT and hands the claims to the page), by api_v3 (which
 * looks the user up), and by PostgREST (which `SET ROLE`s to the `role`
 * claim). When sign-in misbehaves, the layer that disagrees is the one to
 * look at, so they are shown side by side.
 */
import hyper from "@macrostrat/hyper";
import {
  Button,
  Callout,
  Card,
  Icon,
  Intent,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import { postgrestPrefix } from "@macrostrat-web/settings";
import type { IconName } from "@blueprintjs/icons";
import { usePageContext } from "vike-react/usePageContext";
import { type ReactNode, useEffect, useState } from "react";
import {
  DegradedNotice,
  isDegraded,
  type SessionUser,
  useAssumeRole,
  useUserRecord,
} from "~/components/auth";
import { formatDateTime } from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function IntrospectionPanel() {
  // `pageContext.user` is typed as the login record; here it is the raw claims.
  const user = usePageContext().user as unknown as SessionUser | null;
  const record = useUserRecord();
  const postgrest = usePostgRESTStatus();

  return h("div.introspection-grid", [
    h(LayerCard, {
      icon: "globe-network",
      title: "Web server",
      subtitle: "JWT claims verified from the cookie at render time",
      body: h(ClaimsList, { claims: user, emptyText: "No session cookie" }),
    }),
    h(LayerCard, {
      icon: "cloud",
      title: "API",
      subtitle: "GET /security/me — the stored record and the session's role",
      body: h(AsyncClaims, {
        loading: record.loading,
        error: record.error,
        claims: record.record,
      }),
    }),
    h(LayerCard, {
      icon: "database",
      title: "PostgREST",
      subtitle: "rpc/auth_status — the role the database session assumed",
      body: h(AsyncClaims, {
        loading: postgrest.loading,
        error: postgrest.error,
        claims: postgrest.status,
      }),
    }),
  ]);
}

function LayerCard({ icon, title, subtitle, body }) {
  return h(Card, { className: "layer-card" }, [
    h("div.layer-header", [
      h(Icon, { icon: icon as IconName }),
      h("div", [h("h3", title), h("div.muted", subtitle)]),
    ]),
    body,
  ]);
}

function AsyncClaims({ loading, error, claims }) {
  if (loading) return h(Spinner, { size: 20 });
  if (error != null) {
    return h(Callout, { intent: Intent.WARNING, compact: true }, error);
  }
  return h(ClaimsList, { claims });
}

/** A flat object as a definition list. Dates and the JWT `exp` are made
 * readable; anything structured is shown as JSON. */
function ClaimsList({
  claims,
  emptyText = "Nothing",
}: {
  claims: Record<string, any> | null | undefined;
  emptyText?: string;
}) {
  if (claims == null) return h("div.muted", emptyText);
  const entries = Object.entries(claims);
  if (entries.length === 0) return h("div.muted", emptyText);
  return h(
    "dl.claims",
    entries.map(([key, value]) =>
      h([
        h("dt", { key: `${key}-dt` }, key),
        h("dd", { key }, h(ClaimValue, { name: key, value })),
      ])
    )
  );
}

function ClaimValue({ name, value }: { name: string; value: any }) {
  if (value == null) return h("span.muted", "null");
  if (name === "exp" && typeof value === "number") {
    return h("span", [
      formatDateTime(new Date(value * 1000).toISOString()),
      h("span.muted", ` (${value})`),
    ]);
  }
  if (name.endsWith("_on") && typeof value === "string") {
    return h("span", formatDateTime(value));
  }
  if (name === "role" || name === "actual_role") {
    let intent: Intent = Intent.NONE;
    if (value === "web_admin") intent = Intent.PRIMARY;
    if (value === "web_anon") intent = Intent.WARNING;
    return h(Tag, { minimal: true, intent }, String(value));
  }
  if (typeof value === "object") {
    return h("pre.claim-json", JSON.stringify(value, null, 1));
  }
  if (typeof value === "boolean") return h("code", String(value));
  return h("span", String(value));
}

interface PostgRESTStatus {
  role?: string;
  token?: Record<string, any> | null;
}

function usePostgRESTStatus() {
  const [status, setStatus] = useState<PostgRESTStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${postgrestPrefix}/rpc/auth_status`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((body) => {
        if (cancelled) return;
        // Flatten for the claims list: the database role first, then what
        // PostgREST decoded from the cookie.
        setStatus({ role: body?.role, ...(body?.token ?? {}) });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Request failed");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, loading, error };
}

/** Degrade the session to `web_user`, or restore it. */
export function RoleSwitchPanel({ user }: { user: SessionUser | null }) {
  const { assume, busy, error } = useAssumeRole();

  if (isDegraded(user)) {
    return h(DegradedNotice, { user, compact: false });
  }

  let errorNode: ReactNode = null;
  if (error != null) errorNode = h("p.error", error);

  return h(
    Callout,
    {
      className: "role-switch",
      icon: "eye-open",
      title: "See the site as a user",
    },
    [
      h("p", [
        "Re-issue this session's cookie with the ",
        h("code", "web_user"),
        " role. Every layer — page guards, the API, PostgREST's row security — ",
        "then treats you as an ordinary signed-in user, and the persona ",
        "indicator turns yellow. Restore the role from that indicator, from ",
        "this page, or by logging out and in again.",
      ]),
      errorNode,
      h(
        Button,
        {
          intent: Intent.WARNING,
          icon: "eye-open",
          loading: busy,
          onClick: () => assume("web_user"),
        },
        "Browse as web_user"
      ),
    ]
  );
}
