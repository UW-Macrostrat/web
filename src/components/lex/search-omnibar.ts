/**
 * The lexicon's single search surface: a Blueprint `Omnibar` over the API v2
 * `defs/autocomplete` source (`./search`). Mounted once by the `/lex` layout, so
 * it is reachable from every lexicon page — the header button, the homepage's
 * central search button, or ⌘K / ctrl-K.
 *
 * Rows are categorized into sections (see `categorizeLexResults`) instead of
 * carrying a per-row type tag, and lithologies / environments / intervals render
 * as standardized `@macrostrat/data-components` tags — colored from the joined
 * definition record, with the lithology/environment type or the interval's age
 * range as the tag's detail. Every row carries its ID, right-aligned.
 */
import hyper from "@macrostrat/hyper";
import styles from "./search.module.sass";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { Omnibar } from "@blueprintjs/select";
import { navigate } from "vike/client/router";
import { atom, useAtom, useSetAtom } from "jotai";
import { apiV2Prefix } from "@macrostrat-web/settings";
import {
  MacrostratDataProvider,
  useMacrostratDefs,
} from "@macrostrat/data-provider";
import { Identifier, Tag } from "@macrostrat/data-components";
import {
  categorizeLexResults,
  fetchLexSearch,
  MIN_QUERY_LENGTH,
  type LexSearchItem,
} from "./search";

const h = hyper.styled(styles);

const DEBOUNCE_MS = 250;

/** Whether the lexicon omnibar is open. Shared so any page (or the layout
 * header) can open the single mounted instance. */
export const lexSearchOpenAtom = atom(false);

export function useOpenLexSearch() {
  const setOpen = useSetAtom(lexSearchOpenAtom);
  return useCallback(() => setOpen(true), [setOpen]);
}

/** Debounced cross-lexicon search for a live query string. */
function useLexSearch(query: string, active: boolean) {
  const [results, setResults] = useState<LexSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    controller.current?.abort();
    if (!active || q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ctrl = new AbortController();
    controller.current = ctrl;
    const timeout = setTimeout(async () => {
      try {
        const rows = await fetchLexSearch(q, ctrl.signal);
        if (!ctrl.signal.aborted) setResults(rows as LexSearchItem[]);
      } catch (err) {
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      ctrl.abort();
    };
  }, [query, active]);

  return { results, loading };
}

/**
 * Join matches against the lexicon definition tables and order them into
 * sections. The definition maps are small and cached by
 * `MacrostratDataProvider`, so this costs one fetch each the first time the
 * omnibar is opened.
 */
function useCategorizedResults(results: LexSearchItem[]) {
  const lithologies = useMacrostratDefs("lithologies", null);
  const environments = useMacrostratDefs("environments", null);
  const intervals = useMacrostratDefs("intervals", null, null);

  return useMemo(
    () =>
      categorizeLexResults(results, { lithologies, environments, intervals }),
    [results, lithologies, environments, intervals]
  );
}

function LexSearchRow({ item }: { item: LexSearchItem }) {
  let label;
  if (item.color != null) {
    // Lithology / environment / interval: the standardized colored tag.
    label = h(Tag, {
      name: item.name,
      color: item.color,
      details: item.details,
      size: "small",
    });
  } else {
    label = h("span.result-name", [
      item.name,
      h.if(item.details != null)("span.result-details", item.details),
    ]);
  }

  // Wrapped rather than passing `className` — `hyper.styled` only scopes classes
  // written in a tag string, not ones handed to a component as a prop.
  return h("div.lex-search-row", [
    label,
    h("span.result-id", h(Identifier, { id: item.id })),
  ]);
}

function renderResult(item: LexSearchItem, { handleClick, modifiers }) {
  return h(MenuItem, {
    key: item.key,
    active: modifiers.active,
    disabled: modifiers.disabled,
    onClick: handleClick,
    text: h(LexSearchRow, { item }),
    roleStructure: "listoption",
  });
}

/** Insert a section heading wherever the section changes. Item order already
 * matches section order (`categorizeLexResults`), so this is a single pass.
 *
 * Note: supplying `itemListRenderer` bypasses Blueprint's own empty-state slot,
 * so the `noResults` node has to be rendered here rather than passed as a prop.
 */
function renderResultList(
  { filteredItems, renderItem, itemsParentRef },
  emptyState: React.ReactNode
) {
  const children = [];
  let lastSection: string | null = null;
  filteredItems.forEach((item: LexSearchItem, index: number) => {
    if (item.section !== lastSection) {
      lastSection = item.section;
      children.push(
        h(MenuDivider, { key: `section-${item.section}`, title: item.section })
      );
    }
    children.push(renderItem(item, index));
  });
  if (children.length === 0) {
    children.push(emptyState);
  }
  return h(
    "div.lex-search-results",
    h(Menu, { ulRef: itemsParentRef }, children)
  );
}

function LexSearchOmnibar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { results, loading } = useLexSearch(query, isOpen);
  const items = useCategorizedResults(results);

  const onItemSelect = useCallback(
    (item: LexSearchItem) => {
      onClose();
      setQuery("");
      navigate(item.href);
    },
    [onClose]
  );

  let emptyMessage = "Search the Macrostrat lexicon…";
  if (loading) {
    emptyMessage = "Searching…";
  } else if (query.trim().length >= MIN_QUERY_LENGTH) {
    emptyMessage = "No matches";
  }
  const emptyState = h(MenuItem, {
    disabled: true,
    text: emptyMessage,
    key: "empty",
  });

  return h(Omnibar<LexSearchItem>, {
    isOpen,
    onClose,
    query,
    onQueryChange: setQuery,
    items,
    // Matching is done by the API; don't re-filter in the browser.
    itemListPredicate: (_query, _items) => _items,
    itemRenderer: renderResult,
    itemListRenderer: (props) => renderResultList(props, emptyState),
    onItemSelect,
    resetOnSelect: true,
    inputProps: {
      placeholder: "Search lithologies, names, intervals, minerals…",
    },
  });
}

/** Is this a ⌘K / ctrl-K keydown? */
function isSearchHotkey(event: KeyboardEvent) {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
}

/**
 * Hosts the single omnibar instance (mounted by the `/lex` layout) and owns the
 * ⌘K hotkey. The omnibar and its definition joins are mounted lazily on first
 * open, so an untouched lexicon page pays nothing for it.
 */
export function LexSearchHost() {
  const [isOpen, setOpen] = useAtom(lexSearchOpenAtom);
  const [everOpened, setEverOpened] = useState(false);
  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (isOpen) setEverOpened(true);
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isSearchHotkey(event)) return;
      event.preventDefault();
      setOpen((open) => !open);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  if (!everOpened) return null;

  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(LexSearchOmnibar, { isOpen, onClose: close })
  );
}

interface LexSearchButtonProps {
  minimal?: boolean;
  large?: boolean;
  text?: string;
}

/** Opens the omnibar. Rendered small in the lex page header, and large in the
 * middle of the lexicon homepage. */
export function LexSearchButton({
  minimal = true,
  large = false,
  text = "Search",
}: LexSearchButtonProps) {
  const openSearch = useOpenLexSearch();
  const hotkeyLabel = useMemo(getHotkeyLabel, []);

  return h(
    Button,
    {
      minimal,
      large,
      small: !large,
      icon: "search",
      onClick: openSearch,
    },
    [h("span.label", text), h("span.hotkey", hotkeyLabel)]
  );
}

/** The lex page-header control: the compact search button. */
export function LexSearchControl() {
  return h("div.lex-search-control", h(LexSearchButton));
}

/** The homepage's central call to action — the lexicon's primary entry point. */
export function LexSearchPrompt() {
  return h("div.lex-search-prompt", [
    h(LexSearchButton, {
      minimal: false,
      large: true,
      text: "Search the lexicon",
    }),
    h(
      "p.search-hint",
      "Lithologies, stratigraphic names, intervals, minerals, environments, economic uses, columns, and projects."
    ),
  ]);
}

function getHotkeyLabel() {
  // The lex layout renders on the server too, where `navigator` is absent.
  if (typeof navigator === "undefined") return "⌘K";
  const isApple = /Mac|iPhone|iPad/.test(
    navigator.platform ?? navigator.userAgent ?? ""
  );
  return isApple ? "⌘K" : "Ctrl+K";
}
