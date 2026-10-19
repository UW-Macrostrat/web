/** `/lex/match/lithologies`: type a lithology description and see the
 * lithologies, attributes and proportions the column importer reads from it,
 * drawn with the lexicon's own `LithologyList` so every tag links to its page.
 * The search runs on Enter, on the button, and shortly after typing stops. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Callout, TextArea } from "@blueprintjs/core";
import { LithologyList } from "@macrostrat/data-components";
import { apiV3Prefix } from "@macrostrat-web/settings";
import { Link } from "~/components";
import {
  describeFetchError,
  ErrorNotice,
  h,
  MatchPage,
  Muted,
  Notices,
  Panel,
  Presets,
} from "../console";

const SEARCH_ENDPOINT = `${apiV3Prefix}/dev/match/liths`;

/** Auto-search this long after the reader stops typing. */
const SEARCH_DEBOUNCE_MS = 1200;

const PRESETS = [
  "cross-bedded fine sandstone and siltstone",
  "dolomitic limestone (60%); chert (40%)",
  // `andesitic porphyry` matches nothing (`porphyry` isn't a lithology name);
  // rewritten as `porphyritic andesite` it resolves to andesite + the
  // porphyritic attribute — a worked example of fixing unmatched wording.
  "andesitic porphyry",
  "porphyritic andesite",
  "calcareous ooze",
].map((text) => ({ label: text, value: text }));

/** Results are grouped by abundance; an unstated abundance (null `dom`) falls
 * under the plain heading. */
const DOM_GROUPS = [
  { key: "dom", label: "Dominant" },
  { key: "sub", label: "Subsidiary" },
  { key: null, label: "Lithologies" },
];

/** Shape a found lith into what the lithology components read; `lith_id` is
 * what earns each tag its lexicon link. */
function toLithology(lith) {
  return {
    lith_id: lith.id,
    name: lith.name,
    color: lith.color,
    atts: (lith.attributes ?? []).map((att) => att.name),
    prop: lith.prop,
  };
}

export function Page() {
  const [text, setText] = useState(PRESETS[0].value);
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (query: string) => {
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const q = query.trim();
    if (!q) {
      setData(null);
      setError(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const url = `${SEARCH_ENDPOINT}?text=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(`The search failed (${res.status}).`);
      setData(body);
    } catch (e) {
      setError(describeFetchError(e, "The search couldn't be completed."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!text.trim()) {
      setData(null);
      return;
    }
    timer.current = setTimeout(() => runSearch(text), SEARCH_DEBOUNCE_MS);
    return () => {
      if (timer.current != null) clearTimeout(timer.current);
    };
  }, [text, runSearch]);

  const clear = useCallback(() => {
    setText("");
    setData(null);
    setError(null);
  }, []);

  return h(MatchPage, {
    lead: "Type a lithology description and see the lithologies, attributes and proportions Macrostrat reads from it — the same parse the column importer runs on a unit's lithology text.",
    presets: h(Presets, { items: PRESETS, onPick: setText }),
    query: h(QueryPanel, {
      text,
      setText,
      loading,
      onSearch: () => runSearch(text),
      clear,
    }),
    results: h(ResultsPanel, { data, error, loading }),
  });
}

function QueryPanel({ text, setText, loading, onSearch, clear }) {
  const onKeyDown = (e) => {
    // Enter searches; Shift+Enter keeps a newline for multi-line input.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSearch();
    }
  };

  return h(Panel, { title: "Lithology text" }, [
    h(TextArea, {
      fill: true,
      autoResize: true,
      value: text,
      placeholder: "sandstone; shale (minor); limestone",
      onChange: (e) => setText(e.target.value),
      onKeyDown,
    }),
    h("p.hint", [
      "Separate lithologies with ",
      h("code", ";"),
      ", ",
      h("code", "and"),
      " or ",
      h("code", "or"),
      ". A trailing ",
      h("code", "(60%)"),
      " or ",
      h("code", "(major)"),
      " gives the abundance. ",
      h("kbd", "Enter"),
      " searches.",
    ]),
    h("div.actions", [
      h(Button, {
        intent: "primary",
        icon: "search",
        text: "Search",
        loading,
        onClick: onSearch,
      }),
      h(Button, { minimal: true, text: "Clear", onClick: clear }),
    ]),
  ]);
}

function ResultsPanel({ data, error, loading }) {
  const count = data?.liths.length ?? 0;

  let aside = null;
  if (data != null) {
    aside = h("span.count", `${count} lith${count === 1 ? "" : "s"}`);
  }

  let body = null;
  if (loading) {
    body = h(Muted, "Searching…");
  } else if (data != null) {
    body = h(LithResults, { data });
  } else if (error == null) {
    body = h(Muted, "Type a lithology description to search.");
  }

  return h(Panel, { title: "Results", aside, "aria-live": "polite" }, [
    h(ErrorNotice, { error }),
    body,
  ]);
}

function LithResults({ data }) {
  const groups = DOM_GROUPS.map((group) => ({
    label: group.label,
    liths: data.liths.filter((lith) => (lith.dom ?? null) === group.key),
  })).filter((group) => group.liths.length > 0);

  // The rewrite tip shows whenever a lithology went unrecognised — nothing
  // found at all, or some words resolved and others didn't.
  const hasUnmatched =
    data.liths.length === 0 ||
    (data.notices ?? []).some((notice) => notice.code === "unknown-lithology");

  let tip = null;
  if (hasUnmatched) tip = h(RewriteTip);

  let body: any = h(Muted, "No lithologies found for this text.");
  if (groups.length > 0) {
    body = groups.map((group) =>
      h(LithologyList, {
        key: group.label,
        label: group.label,
        lithologies: group.liths.map(toLithology),
      })
    );
  }

  return h("div.results-body", [
    h(Notices, { notices: data.notices }),
    tip,
    body,
  ]);
}

/** Text is read as `<attribute> <lithology>`, so reordering the words often
 * resolves a lithology that wasn't found. */
function RewriteTip() {
  return h(Callout, { intent: "primary", icon: "lightbulb", compact: true }, [
    h("strong", "No result for a lithology? "),
    "Text is read as ",
    h("code", "<attribute> <lithology>"),
    ", so try the words the other way round — ",
    h("code", "porphyritic andesite"),
    " rather than ",
    h("code", "andesitic porphyry"),
    ". The valid names are in the ",
    h(Link, { href: "/lex/lithologies" }, "lithology"),
    " and ",
    h(Link, { href: "/lex/lith-atts" }, "attribute"),
    " dictionaries.",
  ]);
}
