import h from "@macrostrat/hyper";
import { Callout, Intent } from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import type { ReactNode } from "react";
import { isDegraded } from "~/components/auth";

/** The API refuses a degraded session, so say so instead of failing to load. */
export function AdminOnly({
  what,
  children,
}: {
  what: string;
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!isDegraded(user)) return h([children]);
  return h(
    Callout,
    { intent: Intent.WARNING, icon: "eye-open" },
    `Restore your role on the admin page to ${what}.`
  );
}
