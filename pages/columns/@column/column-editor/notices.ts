/** Showing the ingestion pipeline's notices: a list grouped by level, and a
 * toolbar button carrying the counts that opens it. */
import hyper from "@macrostrat/hyper";
import { Button, Callout, Icon, PopoverNext, Tag } from "@blueprintjs/core";
import { useAtomValue } from "./state/ctx";
import type { IngestNotice, NoticeLevel } from "./ingest-api";
import { noticeCountsAtom, noticesAtom } from "./state/ingest";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const LEVELS: NoticeLevel[] = ["error", "warning", "info"];

const LEVEL_INTENT: Record<NoticeLevel, "danger" | "warning" | "primary"> = {
  error: "danger",
  warning: "warning",
  info: "primary",
};

const LEVEL_ICON: Record<NoticeLevel, "error" | "warning-sign" | "info-sign"> = {
  error: "error",
  warning: "warning-sign",
  info: "info-sign",
};

/** Where a notice applies, as a short tail: `units row 4 · unit Mazko Fm · b_int`. */
function noticeLocation(notice: IngestNotice): string | null {
  const parts: string[] = [];
  if (notice.sheet != null) parts.push(notice.sheet);
  if (notice.row != null) parts.push(`row ${notice.row}`);
  if (notice.col_id != null) parts.push(`column ${notice.col_id}`);
  if (notice.unit != null) parts.push(`unit ${notice.unit}`);
  if (notice.column != null) parts.push(`\`${notice.column}\``);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function NoticeItem({ notice }: { notice: IngestNotice }) {
  const location = noticeLocation(notice);
  let where = null;
  if (location != null) {
    where = h("span.notice-location", location);
  }
  return h("li.notice-item", [
    h(Icon, { icon: LEVEL_ICON[notice.level], size: 12, intent: LEVEL_INTENT[notice.level] }),
    h("span.notice-body", [
      h("span.notice-message", notice.message),
      where,
      h("code.notice-code", notice.code),
    ]),
  ]);
}

export interface NoticesListProps {
  notices: IngestNotice[];
  /** What to say when there is nothing to say. */
  emptyText?: string | null;
}

/** The notices, worst first, in groups. */
export function NoticesList({ notices, emptyText = "No notices." }: NoticesListProps) {
  if (notices.length === 0) {
    if (emptyText == null) return null;
    return h("p.notices-empty", emptyText);
  }
  const groups = LEVELS.map((level) => ({
    level,
    items: notices.filter((n) => n.level === level),
  })).filter((group) => group.items.length > 0);

  return h(
    "div.notices-list",
    groups.map((group) =>
      h(
        Callout,
        {
          key: group.level,
          intent: LEVEL_INTENT[group.level],
          icon: null,
          compact: true,
          title: `${group.items.length} ${group.level}${group.items.length === 1 ? "" : "s"}`,
        },
        h(
          "ul.notice-items",
          group.items.map((notice, i) => h(NoticeItem, { key: i, notice }))
        )
      )
    )
  );
}

/** The counts as small tags: nothing when there is nothing. */
export function NoticeCountTags({
  counts,
}: {
  counts: Record<NoticeLevel, number>;
}) {
  const tags = LEVELS.filter((level) => counts[level] > 0).map((level) =>
    h(
      Tag,
      { key: level, minimal: true, intent: LEVEL_INTENT[level], size: "small" },
      `${counts[level]}`
    )
  );
  if (tags.length === 0) return null;
  return h("span.notice-counts", tags);
}

/** The editor's notices behind a toolbar button that says how many. Nothing
 * at all when the pipeline has not been asked yet. */
export function NoticesButton() {
  const notices = useAtomValue(noticesAtom);
  const counts = useAtomValue(noticeCountsAtom);
  if (notices.length === 0) return null;

  let intent: "danger" | "warning" | "none" = "none";
  if (counts.error > 0) {
    intent = "danger";
  } else if (counts.warning > 0) {
    intent = "warning";
  }

  return h(PopoverNext, {
    minimal: true,
    placement: "bottom-end",
    className: "notices-popover-target",
    content: h("div.notices-popover", h(NoticesList, { notices })),
    renderTarget: ({ isOpen, ...targetProps }) =>
      h(
        Button,
        {
          ...targetProps,
          minimal: true,
          small: true,
          active: isOpen,
          intent,
          icon: "clipboard",
          rightIcon: "caret-down",
          title: "What the ingestion pipeline found",
        },
        ["Notices ", h(NoticeCountTags, { counts })]
      ),
  });
}
