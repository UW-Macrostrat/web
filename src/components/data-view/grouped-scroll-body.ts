/** A grouped scroll body for `@macrostrat/data-sheet`'s `DataPanel`: cards in
 * normal flow under sticky section and group headers, wrapping to fit.
 *
 * Nothing is windowed. The panel loads rows a page at a time as the list
 * scrolls, so the body only ever holds what has been loaded, and the browser
 * lays it out: cards take their own width and wrap, and each header sticks for
 * as long as its section or group is on screen.
 */

import { Children, useMemo, type ComponentType, type ReactNode } from "react";
import { useSelector } from "@macrostrat/data-sheet";
import classNames from "classnames";

import h from "./grouped-scroll-body.module.sass";

export interface RowGroup {
  key: string | number;
  label: ReactNode;
}

export interface GroupedScrollBodyOptions<T = any> {
  /** Outer grouping, under a sticky `h2`. */
  sectionOf?: (row: T) => RowGroup | null;
  /** Inner grouping, under a sticky `h3` beneath the section's. */
  groupOf?: (row: T) => RowGroup | null;
  /** A divider within a group, before the first row whose key differs from
   * the row above it. Not sticky; a null key draws none. */
  dividerOf?: (row: T) => RowGroup | null;
}

interface ScrollBodyProps {
  children?: ReactNode;
}

interface Segment {
  divider: RowGroup | null;
  cards: number[];
}

interface Group {
  group: RowGroup | null;
  segments: Segment[];
}

interface Section {
  section: RowGroup | null;
  groups: Group[];
}

export function createGroupedScrollBody<T = any>(
  options: GroupedScrollBodyOptions<T>
): ComponentType<ScrollBodyProps> {
  const hasSections = options.sectionOf != null;

  return function GroupedScrollBody({ children }: ScrollBodyProps) {
    const rows = useSelector<T, T[]>((state) => state.data) ?? [];
    const cards = useMemo(() => Children.toArray(children), [children]);
    const loaded = useMemo(() => rows.filter((r) => r != null), [rows]);
    const sections = useMemo(() => buildSections(loaded, options), [loaded]);

    // Cards past the loaded rows are the panel's loading placeholders
    let pending = null;
    if (cards.length > loaded.length) {
      pending = h("div.grouped-cards", cards.slice(loaded.length));
    }

    return h(
      "div.grouped-root",
      { className: classNames({ "has-sections": hasSections }) },
      [
        ...sections.map((section, i) =>
          h(SectionBlock, { key: blockKey(section.section, i), section, cards })
        ),
        pending,
      ]
    );
  };
}

function SectionBlock({ section, cards }: { section: Section; cards: any[] }) {
  let header = null;
  if (section.section != null) {
    header = h("h2.grouped-section-header", section.section.label);
  }
  return h("section.grouped-section", [
    header,
    ...section.groups.map((group, i) =>
      h(GroupBlock, { key: blockKey(group.group, i), group, cards })
    ),
  ]);
}

function GroupBlock({ group, cards }: { group: Group; cards: any[] }) {
  let header = null;
  if (group.group != null) {
    header = h("h3.grouped-group-header", group.group.label);
  }
  return h("div.grouped-group", [
    header,
    ...group.segments.map((segment, i) =>
      h(SegmentBlock, { key: blockKey(segment.divider, i), segment, cards })
    ),
  ]);
}

function SegmentBlock({ segment, cards }: { segment: Segment; cards: any[] }) {
  let divider = null;
  if (segment.divider != null) {
    divider = h("div.grouped-divider", segment.divider.label);
  }
  return h([
    divider,
    h(
      "div.grouped-cards",
      segment.cards.map((index) => cards[index])
    ),
  ]);
}

function blockKey(group: RowGroup | null, index: number): string {
  return `${group?.key ?? "none"}-${index}`;
}

/** Sections of groups of segments, each holding a run of consecutive cards.
 * A new section always opens a new group, even if the group key repeats. */
function buildSections<T>(
  rows: T[],
  opts: GroupedScrollBodyOptions<T>
): Section[] {
  const sections: Section[] = [];
  let section: Section | null = null;
  let group: Group | null = null;
  let segment: Segment | null = null;

  rows.forEach((row, index) => {
    const sectionKey = opts.sectionOf?.(row) ?? null;
    if (section == null || sectionKey?.key !== section.section?.key) {
      section = { section: sectionKey, groups: [] };
      sections.push(section);
      group = null;
    }

    const groupKey = opts.groupOf?.(row) ?? null;
    if (group == null || groupKey?.key !== group.group?.key) {
      group = { group: groupKey, segments: [] };
      section.groups.push(group);
      segment = null;
    }

    const divider = opts.dividerOf?.(row) ?? null;
    const opensDivider =
      divider != null && divider.key !== segment?.divider?.key;
    if (segment == null || opensDivider) {
      segment = { divider, cards: [] };
      group.segments.push(segment);
    }
    segment.cards.push(index);
  });

  return sections;
}
