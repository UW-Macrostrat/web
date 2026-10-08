import h from "@macrostrat/hyper";
import { useCallback, useEffect, useRef, useState } from "react";
import { LithologyList } from "@macrostrat/data-components";
import { apiV3Prefix } from "@macrostrat-web/settings";
import "./lith-match.css";

/*
 * Lithology search (/lex/lith-match).
 *
 * Type a lithology description and see the Macrostrat lithologies, attributes and
 * proportions it resolves to, rendered with the shared `LithologyList` so results
 * carry the lexicon's colors and links. The search runs on Enter, on the button,
 * and shortly after the user stops typing.
 */

const SEARCH_ENDPOINT = `${apiV3Prefix}/dev/match/liths`;

// Auto-search this long after the user stops typing.
const SEARCH_DEBOUNCE_MS = 1500;

const PRESETS = [
  "cross-bedded fine sandstone and siltstone",
  "dolomitic limestone (60%); chert (40%)",
  // `andesitic porphyry` matches nothing (`porphyry` isn't a lithology name);
  // rewritten as `porphyritic andesite` it resolves to andesite + the
  // porphyritic attribute — a worked example of fixing unmatched wording.
  "andesitic porphyry",
  "porphyritic andesite",
  "calcareous ooze",
];

// Results are grouped by abundance; each group renders as its own labelled
// LithologyList (null `dom` — abundance unstated — falls under "Lithologies").
const DOM_GROUPS = [
  { key: "dom", label: "Dominant" },
  { key: "sub", label: "Subsidiary" },
  { key: null, label: "Lithologies" },
];

/** Shape a found lith into what the data-components lith components read.
 * `lith_id` is what earns each tag its lexicon link for free. */
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
  const [text, setText] = useState(PRESETS[0]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const runSearch = useCallback(async (query) => {
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
      if (!res.ok) throw new Error(`Search failed (${res.status}).`);
      setData(body);
    } catch (e) {
      setError("The search couldn't be completed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Run the search a short while after the user stops typing (and once on load
  // for the default text). Enter and the button trigger it immediately.
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

  return h("div.lith-console", [
    h(
      "p.lm-intro",
      "Search Macrostrat's lithology vocabulary. Type a lithology description — " +
        "e.g. `cross-stratified sandstone` — and see the lithologies, attributes " +
        "and proportions it resolves to."
    ),
    h(Presets, { onPick: setText }),
    h("div.lm-grid", [
      h(InputPanel, {
        text,
        setText,
        loading,
        onSearch: () => runSearch(text),
        clear,
      }),
      h(ResultsPanel, { data, error, loading }),
    ]),
  ]);
}

function Presets({ onPick }) {
  return h("div.lm-presets", [
    h("span.lm-presets-label", "Try:"),
    PRESETS.map((preset) =>
      h(
        "button.lm-chip",
        { key: preset, type: "button", onClick: () => onPick(preset) },
        preset
      )
    ),
  ]);
}

function InputPanel({ text, setText, loading, onSearch, clear }) {
  const onKeyDown = (e) => {
    // Enter searches; Shift+Enter keeps a newline for multi-line input.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSearch();
    }
  };

  return h("section.lm-panel", [
    h("h3.lm-h3", "Lithology text"),
    h("textarea.lm-input", {
      rows: 4,
      value: text,
      placeholder: "sandstone; shale (minor); limestone",
      onChange: (e) => setText(e.target.value),
      onKeyDown,
    }),
    h("p.lm-hint", [
      "Separate lithologies with ",
      h("code", ";"),
      ", ",
      h("code", "and"),
      " or ",
      h("code", "or"),
      ". Add a trailing ",
      h("code", "(60%)"),
      " or ",
      h("code", "(major)"),
      " for abundance. Press ",
      h("kbd", "Enter"),
      " to search.",
    ]),
    h("div.lm-actions", [
      h(
        "button.lm-run",
        { type: "button", onClick: onSearch, disabled: loading },
        loading ? "Searching…" : "Search"
      ),
      h("button.lm-reset", { type: "button", onClick: clear }, "Clear"),
    ]),
  ]);
}

function ResultsPanel({ data, error, loading }) {
  const count = data?.liths.length ?? 0;

  let placeholder = null;
  if (!loading && error == null && data == null) {
    placeholder = h("p.lm-muted", "Type a lithology description to search.");
  }

  let results = null;
  if (data != null) {
    results = h(LithResults, { data });
  }

  return h("section.lm-panel.lm-results", { "aria-live": "polite" }, [
    h("div.lm-results-head", [
      h("h3.lm-h3", "Results"),
      h.if(data != null)(
        "span.lm-count",
        `${count} lith${count === 1 ? "" : "s"}`
      ),
    ]),
    h.if(error != null)("div.lm-error", error),
    h.if(loading)("p.lm-muted", "Searching…"),
    placeholder,
    results,
  ]);
}

function LithResults({ data }) {
  const groups = DOM_GROUPS.map((group) => ({
    label: group.label,
    liths: data.liths.filter((lith) => (lith.dom ?? null) === group.key),
  })).filter((group) => group.liths.length > 0);

  // Show the rewrite tip whenever a lithology went unrecognised — either nothing
  // was found at all, or some words resolved and others didn't.
  const hasUnmatched =
    data.liths.length === 0 ||
    (data.notices ?? []).some((notice) => notice.code === "unknown-lithology");

  let body = h("p.lm-muted", "No lithologies found for this text.");
  if (groups.length > 0) {
    body = groups.map((group) =>
      h(LithologyList, {
        key: group.label,
        label: group.label,
        lithologies: group.liths.map(toLithology),
      })
    );
  }

  return h("div.lm-lith-results", [
    h(Notices, { notices: data.notices }),
    h.if(hasUnmatched)(RewriteTip),
    body,
  ]);
}

/** Shown when a lithology wasn't found: text is read as `<attribute> <lithology>`,
 * so reordering the words often resolves it. */
function RewriteTip() {
  return h("div.lm-tip", [
    h("strong", "No result for a lithology? "),
    "Text is read as ",
    h("code", "<attribute> <lithology>"),
    ", so try a variation of the wording — e.g. ",
    h("code", "porphyritic andesite"),
    " instead of ",
    h("code", "andesitic porphyry"),
    ". Browse valid names in the ",
    h("a", { href: "/lex/lithologies" }, "lithology"),
    " and ",
    h("a", { href: "/lex/lith-atts" }, "attribute"),
    " lexicons.",
  ]);
}

function Notices({ notices }) {
  if (notices == null || notices.length === 0) return null;
  return h(
    "div.lm-messages",
    notices.map((notice, i) =>
      h(
        "div.lm-message",
        { key: i, className: `lm-message-${notice.level}` },
        [h("strong", notice.message), h("span.lm-code", ` · ${notice.code}`)]
      )
    )
  );
}
