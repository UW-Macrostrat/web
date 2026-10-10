/** The pieces the lexicon's matching tools share: the page shape (a lead, a
 * row of worked examples, the query panel beside its results), and the ways
 * they report back — notices from the API, an error, the empty state. */
import hyper from "@macrostrat/hyper";
import { Callout, Tag, type Intent } from "@blueprintjs/core";
import type { ReactNode } from "react";
import styles from "./match.module.sass";

export const h = hyper.styled(styles);

export function MatchPage({
  lead,
  presets,
  query,
  results,
}: {
  lead: ReactNode;
  presets?: ReactNode;
  query: ReactNode;
  results: ReactNode;
}) {
  return h("div.match-page", [
    h("p.lead", lead),
    presets,
    h("div.console", [query, results]),
  ]);
}

/** Worked examples, as chips. */
export function Presets<T>({
  label = "Try:",
  items,
  onPick,
}: {
  label?: string;
  items: { label: string; value: T }[];
  onPick(value: T): void;
}) {
  return h("div.presets", [
    h("span.presets-label", label),
    items.map((item) =>
      h(
        Tag,
        {
          key: item.label,
          interactive: true,
          minimal: true,
          round: true,
          onClick: () => onPick(item.value),
        },
        item.label
      )
    ),
  ]);
}

export function Panel({
  title,
  aside,
  className,
  children,
  ...rest
}: {
  title: ReactNode;
  /** Beside the title: a count, a status. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
  [key: string]: any;
}) {
  return h("section.panel", { className, ...rest }, [
    h("div.panel-head", [h("h3", title), aside]),
    children,
  ]);
}

/** A notice the API attached to its answer. Either matcher's shape: the
 * lithology matcher's `{level, code, message}` or the name matcher's
 * `{type, message, details}`. */
export interface MatchNotice {
  message: string;
  level?: string;
  type?: string;
  code?: string;
  details?: string | null;
}

const NOTICE_INTENT: Record<string, Intent> = {
  info: "primary",
  warning: "warning",
  error: "danger",
};

export function Notices({ notices }: { notices?: MatchNotice[] | null }) {
  if (notices == null || notices.length === 0) return null;
  return h(
    "div.notices",
    notices.map((notice, i) => {
      const level = notice.level ?? notice.type ?? "info";
      let code: ReactNode = null;
      if (notice.code != null) code = h("span.notice-code", notice.code);
      let details: ReactNode = null;
      if (notice.details) details = h("p", notice.details);
      return h(
        Callout,
        { key: i, compact: true, intent: NOTICE_INTENT[level] ?? "none" },
        [h("strong", notice.message), code, details]
      );
    })
  );
}

export function ErrorNotice({ error }: { error: string | null }) {
  if (error == null) return null;
  return h(Callout, { intent: "danger", icon: "error", compact: true }, error);
}

export function Muted({ children }: { children: ReactNode }) {
  return h("p.muted", children);
}

/** What a failed request should say. */
export function describeFetchError(error: any, fallback: string): string {
  const message = error?.message ?? "";
  if (message.includes("Failed to fetch")) {
    return "The API couldn't be reached. Check that it is running and that your browser trusts its certificate.";
  }
  return message || fallback;
}
