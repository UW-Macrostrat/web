/**
 * Stateless, presentational controls for the map-ingestion list.
 *
 * Everything here is **fully controlled** — props in, callbacks out, no store,
 * atom, or API access — so these are candidates for promotion into
 * `@macrostrat/data-components` (or a data-sheet filter-UI kit) once their
 * shapes settle. Domain wiring (which filter, which endpoint, which colors)
 * lives in `ingestion-list.ts`; the coupled state lives in `view-state.ts`.
 */
import hyper from "@macrostrat/hyper";
import styles from "./controls.module.sass";
import {
  Button,
  Checkbox,
  ControlGroup,
  HTMLSelect,
  InputGroup,
  MenuItem,
  PopoverNext,
  SegmentedControl,
  Tag,
} from "@blueprintjs/core";
import { MultiSelect } from "@blueprintjs/select";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import { type ReactNode, useRef } from "react";

const h = hyper.styled(styles);

/** Readable text (dark/light) for a tag background, by perceived luminance. */
export function textColorFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.6) return "#182026";
  return "#ffffff";
}

export interface ColoredTagProps {
  name: string;
  /** Background color; text color is derived for contrast. */
  color?: string;
  /** Rendered `minimal` (outlined) — used for a partially-applied tag. */
  minimal?: boolean;
  interactive?: boolean;
  title?: string;
  onRemove?: () => void;
  onClick?: (event: any) => void;
}

/** A tag chip whose color is supplied by the caller. */
export function ColoredTag({
  name,
  color,
  minimal = false,
  interactive,
  title,
  onRemove,
  onClick,
}: ColoredTagProps) {
  let style: Record<string, string> | undefined = undefined;
  if (color != null && !minimal) {
    style = { backgroundColor: color, color: textColorFor(color) };
  } else if (color != null) {
    style = { color };
  }
  return h(
    Tag,
    {
      className: "colored-tag",
      minimal,
      interactive: interactive ?? onClick != null,
      title,
      onRemove,
      onClick,
      style,
    },
    name
  );
}

// ---- Open search (free text + tags in one control) ----

export interface SearchValue {
  /** Free text. */
  text: string;
  /** Selected tags. */
  tags: string[];
}

export interface OpenSearchControlProps {
  value: SearchValue;
  /** `null` clears the search entirely. */
  onChange: (value: SearchValue | null) => void;
  /** Tags offered in the dropdown. */
  tags: string[];
  colorForTag?: (tag: string) => string;
  placeholder?: string;
  /** Message for the dropdown when nothing matches. */
  noResultsText?: string;
}

export function isSearchEmpty(value: SearchValue | null | undefined): boolean {
  return (value?.text ?? "").trim() === "" && (value?.tags ?? []).length === 0;
}

/**
 * An open search bar: the **query is the text search** and the **chips are
 * tags**, with the available tags as its dropdown — so text, tag, and any
 * combination are one control, and what's being searched is visible rather than
 * implied.
 */
export function OpenSearchControl({
  value,
  onChange,
  tags,
  colorForTag,
  placeholder = "Search…",
  noResultsText = "No matches",
}: OpenSearchControlProps) {
  const text = value?.text ?? "";
  const selected = value?.tags ?? [];

  // Selecting a tag can fire two handlers in one batch (item-select, then the
  // tag input's query reset), and both would otherwise derive from the same
  // stale render snapshot — so the second would revert the first. Patching onto
  // a ref makes the sequence order-independent.
  const valueRef = useRef<SearchValue>({ text, tags: selected });
  valueRef.current = { text, tags: selected };

  const commit = (patch: Partial<SearchValue>) => {
    const next = { ...valueRef.current, ...patch };
    valueRef.current = next;
    if (isSearchEmpty(next)) {
      onChange(null);
      return;
    }
    onChange(next);
  };

  const toggleTag = (tag: string) => {
    const current = valueRef.current.tags;
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    // Selecting a tag consumes the query text, so the two don't silently AND
    // together (typing "azgs" then picking `Arizona AZGS` should mean the tag).
    commit({ text: "", tags: next });
  };

  // Enter is the tag-selection gesture: with a matching tag the typeahead
  // applies it (and `toggleTag` consumes the query). With nothing matching,
  // Enter has no tag to pick, so it clears the box instead of leaving a dead
  // query sitting there — the text search itself is applied live as you type,
  // so nothing is waiting on Enter.
  const onKeyDown = (event: any) => {
    if (event.key !== "Enter") return;
    const query = valueRef.current.text.trim();
    if (query === "") return;
    const q = query.toLowerCase();
    if (tags.some((tag) => tag.toLowerCase().includes(q))) return;
    commit({ text: "" });
  };

  let rightElement: ReactNode = undefined;
  if (!isSearchEmpty(value)) {
    rightElement = h(Button, {
      minimal: true,
      small: true,
      icon: "cross",
      title: "Clear search",
      onClick: () => onChange(null),
    });
  }

  return h(MultiSelect<string>, {
    className: "open-search",
    items: tags,
    selectedItems: selected,
    query: text,
    onQueryChange: (q: string) => commit({ text: q }),
    fill: true,
    // The query is ours to clear (`toggleTag` does it); letting the tag input
    // reset it too only adds a redundant, racier update.
    resetOnSelect: false,
    placeholder,
    itemPredicate: (q: string, tag: string) =>
      tag.toLowerCase().includes(q.toLowerCase()),
    itemRenderer: (tag: string, { handleClick, modifiers }: any) => {
      if (!modifiers.matchesPredicate) return null;
      let icon: "tick" | "blank" = "blank";
      if (selected.includes(tag)) icon = "tick";
      return h(MenuItem, {
        key: tag,
        active: modifiers.active,
        icon,
        text: h(ColoredTag, { name: tag, color: colorForTag?.(tag) }),
        shouldDismissPopover: false,
        onClick: handleClick,
      });
    },
    tagRenderer: (tag: string) => tag,
    onItemSelect: toggleTag,
    onRemove: (tag: string) => toggleTag(tag),
    tagInputProps: {
      leftIcon: "search",
      rightElement,
      tagProps: (_node: any, index: number) => {
        const color = colorForTag?.(selected[index]);
        if (color == null) return {};
        return {
          style: { backgroundColor: color, color: textColorFor(color) },
        };
      },
    },
    popoverProps: { minimal: true, matchTargetWidth: true },
    // MultiSelect calls this *after* its own typeahead key handling, so an
    // Enter that picked a tag has already been consumed by the time we see it.
    popoverTargetProps: { onKeyDown },
    noResults: h(MenuItem, { disabled: true, text: noResultsText }),
  });
}

/**
 * A dropdown holding arbitrary controls (not just menu items).
 *
 * Deliberately **not** focus-trapping: these panels contain text inputs whose
 * own typeahead popovers render in a separate portal, and a focus trap on the
 * outer popover yanks focus back out of them — which is what makes a nested
 * filter submenu feel flighty.
 */
export function ControlsPopover({
  content,
  children,
  placement = "bottom-start",
}: {
  content: ReactNode;
  children: ReactNode;
  placement?: any;
}) {
  return h(
    PopoverNext,
    {
      content,
      placement,
      minimal: true,
      arrow: false,
      enforceFocus: false,
      autoFocus: false,
    },
    children
  );
}

/**
 * A titled block inside a Blueprint `Menu` holding an arbitrary form (rather
 * than a menu item that opens a submenu). Keeps a control one click away
 * instead of two, with no nested popover to lose focus to.
 */
export function MenuFormItem({
  title,
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) {
  return h("li.menu-form-item", [
    h.if(title != null)("div.menu-form-title", title),
    h("div.menu-form-body", children),
  ]);
}

// ---- Small filter forms ----

export interface ChoiceOption {
  value: string;
  label?: string;
}

export interface CheckboxSetControlProps {
  options: ChoiceOption[];
  value: string[];
  /** An empty result is reported as `null` (i.e. no constraint). */
  onChange: (value: string[] | null) => void;
}

/** A multi-value picker: one checkbox per option, inline (no submenu). */
export function CheckboxSetControl({
  options,
  value,
  onChange,
}: CheckboxSetControlProps) {
  const toggle = (option: string) => {
    const next = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    if (next.length === 0) {
      onChange(null);
      return;
    }
    onChange(next);
  };

  return h(
    "div.checkbox-set",
    options.map((option) =>
      h(Checkbox, {
        key: option.value,
        checked: value.includes(option.value),
        label: option.label ?? option.value,
        onChange: () => toggle(option.value),
      })
    )
  );
}

export interface SegmentedChoiceControlProps {
  options: ChoiceOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/** A single-value picker over a short, fixed set of options. */
export function SegmentedChoiceControl({
  options,
  value,
  onChange,
}: SegmentedChoiceControlProps) {
  return h(SegmentedControl, {
    small: true,
    options: options.map((o) => ({
      label: o.label ?? o.value,
      value: o.value,
    })),
    value: value ?? "",
    onValueChange: onChange,
  });
}

export interface OperatorValue {
  operator: string;
  value: string;
}

export interface OperatorValueControlProps {
  operators: ChoiceOption[];
  value: OperatorValue;
  /** An empty value is reported as `null` (i.e. no constraint). */
  onChange: (value: OperatorValue | null) => void;
  placeholder?: string;
  inputType?: string;
}

/**
 * A comparison in one row: operator picker + value box. Kept inline (rather
 * than a submenu) because both parts are one click / one keystroke away — a
 * nested popover for this makes focus feel unstable for no benefit.
 */
export function OperatorValueControl({
  operators,
  value,
  onChange,
  placeholder,
  inputType = "text",
}: OperatorValueControlProps) {
  const operator = value?.operator ?? operators[0]?.value;
  const current = value?.value ?? "";

  const commit = (next: OperatorValue) => {
    if (next.value.trim() === "") {
      onChange(null);
      return;
    }
    onChange(next);
  };

  return h(ControlGroup, { className: "operator-value" }, [
    h(HTMLSelect, {
      key: "operator",
      minimal: true,
      value: operator,
      options: operators.map((o) => ({
        label: o.label ?? o.value,
        value: o.value,
      })),
      onChange: (e: any) =>
        commit({ operator: e.target.value, value: current }),
    }),
    h(InputGroup, {
      key: "value",
      small: true,
      type: inputType,
      placeholder,
      value: current,
      onValueChange: (next: string) => commit({ operator, value: next }),
    }),
  ]);
}

// ---- Year selector ----

export interface YearValue {
  /** A comparison operator (`eq` / `gte` / `lt`). */
  operator: string;
  /** The year, as it appears in the data. */
  year: string;
}

/** The comparisons a year is actually worth making, in plain words. Blueprint
 * has no year picker (only full date pickers, in `@blueprintjs/datetime`), and a
 * free-text year invites typos and years that match nothing — so this is a pair
 * of pickers over the real values. */
export const YEAR_COMPARISONS: ChoiceOption[] = [
  { value: "eq", label: "in" },
  { value: "gte", label: "since" },
  { value: "lt", label: "before" },
];

export interface YearSelectorProps {
  /** The years present in the data, newest first. */
  years: string[];
  value: YearValue | null;
  /** `null` clears the constraint (the "any year" option). */
  onChange: (value: YearValue | null) => void;
  comparisons?: ChoiceOption[];
  anyLabel?: string;
}

/**
 * Pick a year, and how to compare against it — "in 2019", "since 2015",
 * "before 1990". Limited to years that actually occur in the data, so every
 * choice returns something.
 */
export function YearSelector({
  years,
  value,
  onChange,
  comparisons = YEAR_COMPARISONS,
  anyLabel = "any year",
}: YearSelectorProps) {
  const operator = value?.operator ?? comparisons[0].value;
  const year = value?.year ?? "";

  return h(ControlGroup, { className: "year-selector" }, [
    h(HTMLSelect, {
      key: "operator",
      minimal: true,
      value: operator,
      options: comparisons.map((c) => ({
        label: c.label ?? c.value,
        value: c.value,
      })),
      onChange: (e: any) => {
        if (year === "") return;
        onChange({ operator: e.target.value, year });
      },
    }),
    h(HTMLSelect, {
      key: "year",
      minimal: true,
      value: year,
      options: [{ label: anyLabel, value: "" }, ...years],
      onChange: (e: any) => {
        const next = e.target.value;
        if (next === "") {
          onChange(null);
          return;
        }
        onChange({ operator, year: next });
      },
    }),
  ]);
}

// ---- Tag list editor ----

export interface TagUsageCount {
  /** How many of the targeted items carry this tag. */
  count: number;
  /** How many items are targeted. */
  total: number;
}

export interface TagListControlProps {
  /** Every tag available to apply. */
  tags: string[];
  usage: (tag: string) => TagUsageCount;
  /** `add` is `true` to apply the tag to every target, `false` to remove it. */
  onToggle: (tag: string, add: boolean) => void;
  /** Create (and apply) a new tag. Omit to disable creation. */
  onCreate?: (tag: string) => void;
  colorForTag?: (tag: string) => string;
  placeholder?: string;
}

/**
 * Add, remove, and *read* the tags on a set of items in one Blueprint tag list:
 * the applied tags are the chips (removable in place), the dropdown is the rest
 * of the vocabulary, and a tag held by only part of the set reads as a
 * `minimal` chip labelled with its share — so the control doubles as the
 * at-a-glance reference for what the selection carries.
 */
export function TagListControl({
  tags,
  usage,
  onToggle,
  onCreate,
  colorForTag,
  placeholder = "Add a tag…",
}: TagListControlProps) {
  const applied = tags.filter((tag) => usage(tag).count > 0);

  const onItemSelect = (tag: string) => {
    if (!tags.includes(tag)) {
      onCreate?.(tag);
      return;
    }
    const { count, total } = usage(tag);
    onToggle(tag, count < total);
  };

  let createProps: Record<string, any> = {};
  if (onCreate != null) {
    createProps = {
      createNewItemFromQuery: (query: string) => query.trim(),
      createNewItemRenderer: (
        query: string,
        active: boolean,
        handleClick: any
      ) =>
        h(MenuItem, {
          icon: "add",
          text: `Create "${query}"`,
          active,
          shouldDismissPopover: false,
          onClick: handleClick,
        }),
    };
  }

  return h(MultiSelect<string>, {
    className: "tag-list-control",
    items: tags,
    selectedItems: applied,
    fill: true,
    resetOnSelect: true,
    placeholder,
    itemPredicate: (q: string, tag: string) =>
      tag.toLowerCase().includes(q.toLowerCase()),
    itemRenderer: (tag: string, { handleClick, modifiers }: any) => {
      if (!modifiers.matchesPredicate) return null;
      const { count, total } = usage(tag);
      let icon: "tick" | "minus" | "blank" = "blank";
      if (count > 0 && count === total) icon = "tick";
      else if (count > 0) icon = "minus";
      let label: string | undefined = undefined;
      if (count > 0 && count < total) label = `${count} of ${total}`;
      return h(MenuItem, {
        key: tag,
        active: modifiers.active,
        icon,
        label,
        text: h(ColoredTag, { name: tag, color: colorForTag?.(tag) }),
        shouldDismissPopover: false,
        onClick: handleClick,
      });
    },
    tagRenderer: (tag: string) => {
      const { count, total } = usage(tag);
      if (count < total) return `${tag} · ${count}/${total}`;
      return tag;
    },
    onItemSelect,
    onRemove: (tag: string) => onToggle(tag, false),
    tagInputProps: {
      leftIcon: "tag",
      tagProps: (_node: any, index: number) => {
        const tag = applied[index];
        const { count, total } = usage(tag);
        const partial = count < total;
        const color = colorForTag?.(tag);
        if (color == null) return { minimal: partial };
        if (partial) {
          return { minimal: true, style: { color } };
        }
        return {
          style: { backgroundColor: color, color: textColorFor(color) },
        };
      },
    },
    popoverProps: { minimal: true, matchTargetWidth: true },
    noResults: h(MenuItem, { disabled: true, text: "No matching tags" }),
    ...createProps,
  });
}
