/** The editing session for the column named in the route.
 *
 * Every page under `/columns/:id` — the column page, the table view, and
 * the editor's overview, units and location pages — renders inside the
 * editor's isolated jotai provider, bound to one store per column that
 * outlives client-side navigation between them. That is what lets a change
 * made on the units page show on the overview, and the whole column be
 * written or reset at once (`column-editor/state/session`).
 *
 * Imports only the provider and the store registry, which depend on jotai
 * alone, so the layout renders on the server too; the editor's state graph
 * is loaded by the pages, which are client-only. */
import h from "@macrostrat/hyper";
import type { ReactNode } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { EditorScopeProvider } from "./column-editor/state/ctx";
import { getEditSession, sessionKeyFor } from "./column-editor/state/session-store";

export default function ColumnLayout({ children }: { children: ReactNode }) {
  const pageContext = usePageContext();
  const key = sessionKeyFor(pageContext.routeParams?.column);
  const store = getEditSession(key);
  return h(EditorScopeProvider, { store }, children);
}
