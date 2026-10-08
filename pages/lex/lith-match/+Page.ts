import h from "@macrostrat/hyper";
import { useCallback, useState } from "react";
import { LithologyList } from "@macrostrat/data-components";
import { apiV3Prefix } from "@macrostrat-web/settings";
import "./lith-match.css";

/*
 * Lith match console (/lex/lith-match).
 *
 * Runs the column-ingestion lithology matcher (LithsProcessor) over free text
 * via GET /api/v3/dev/match/liths — the same parse `ingest_columns_from_file`
 * runs on a unit's lithology column — and renders the recognised lithologies
 * with the shared `LithologyList`, so they carry the lexicon's colors,
 * attributes, proportions and lexicon links (from `lith_id`) like UnitDetails.
 */

const LITH_ENDPOINT = `${apiV3Prefix}/dev/match/liths`;

const PRESETS = [
  "sandstone, shale (minor); limestone",
  "cross-bedded fine sandstone and siltstone",
  "dolomitic limestone (60%); chert (40%)",
  "andesitic porphyry",
  "calcareous ooze",
];

// Matched liths are grouped by abundance; each group renders as its own labelled
// LithologyList (null `dom` — abundance unstated — falls under "Lithologies").
const DOM_GROUPS = [
  { key: "dom", label: "Dominant" },
  { key: "sub", label: "Subsidiary" },
  { key: null, label: "Lithologies" },
];

/** Shape a matched lith into what the data-components lith components read.
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
  const [lastUrl, setLastUrl] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const runMatch = useCallback(async () => {
    setError(null);
    if (!text.trim()) {
      setError("Enter some lithology text to match.");
      return;
    }
    const url = `${LITH_ENDPOINT}?text=${encodeURIComponent(text.trim())}`;
    setLastUrl(url);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = body?.detail ? JSON.stringify(body.detail) : res.statusText;
        throw new Error(`Request failed (${res.status}): ${detail}`);
      }
      setData(body);
    } catch (e) {
      const unreachable = e?.message?.includes("Failed to fetch");
      let message = e.message;
      if (unreachable) {
        message =
          "Couldn't reach the API. Check that it's running and its certificate is trusted by your browser.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [text]);

  const clear = useCallback(() => {
    setText("");
    setData(null);
    setError(null);
    setLastUrl(null);
  }, []);

  return h("div.lith-console", [
    h(
      "p.lm-intro",
      "Match free lithology text against Macrostrat's lithology vocabulary using " +
        "the column-ingestion matcher — the same parse an ingest runs on a unit's " +
        "lithology column. Enter a lithology description and run it."
    ),
    h(Presets, { onPick: setText }),
    h("div.lm-grid", [
      h(InputPanel, { text, setText, loading, runMatch, clear }),
      h(ResultsPanel, {
        data,
        error,
        loading,
        lastUrl,
        showRaw,
        onToggleRaw: () => setShowRaw(!showRaw),
      }),
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

function InputPanel({ text, setText, loading, runMatch, clear }) {
  return h("section.lm-panel", [
    h("h3.lm-h3", "Lithology text"),
    h("textarea.lm-input", {
      rows: 4,
      value: text,
      placeholder: "sandstone, shale (minor); limestone",
      onChange: (e) => setText(e.target.value),
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
      " for abundance.",
    ]),
    h("div.lm-actions", [
      h(
        "button.lm-run",
        { type: "button", onClick: runMatch, disabled: loading },
        loading ? "Matching…" : "Match liths"
      ),
      h("button.lm-reset", { type: "button", onClick: clear }, "Clear"),
    ]),
  ]);
}

function ResultsPanel({ data, error, loading, lastUrl, showRaw, onToggleRaw }) {
  const count = data?.liths.length ?? 0;

  let placeholder = null;
  if (!loading && error == null && data == null) {
    placeholder = h("p.lm-muted", [
      "Enter lithology text and choose ",
      h("strong", "Match liths"),
      " to see the recognised lithologies here.",
    ]);
  }

  let results = null;
  if (data != null) {
    results = [
      h(LithResults, { data }),
      h(
        "button.lm-rawtoggle",
        { type: "button", onClick: onToggleRaw },
        showRaw ? "Hide raw JSON" : "Show raw JSON"
      ),
      h.if(showRaw)("pre.lm-raw", JSON.stringify(data, null, 2)),
    ];
  }

  return h("section.lm-panel.lm-results", { "aria-live": "polite" }, [
    h("div.lm-results-head", [
      h("h3.lm-h3", "Results"),
      h.if(data != null)(
        "span.lm-count",
        `${count} lith${count === 1 ? "" : "s"}`
      ),
    ]),
    h.if(lastUrl != null)("code.lm-url", { title: lastUrl }, lastUrl),
    h.if(error != null)("div.lm-error", error),
    h.if(loading)("p.lm-muted", "Matching…"),
    placeholder,
    results,
  ]);
}

function LithResults({ data }) {
  const groups = DOM_GROUPS.map((group) => ({
    label: group.label,
    liths: data.liths.filter((lith) => (lith.dom ?? null) === group.key),
  })).filter((group) => group.liths.length > 0);

  let body = h("p.lm-muted", "No lithologies recognised in this text.");
  if (groups.length > 0) {
    body = groups.map((group) =>
      h(LithologyList, {
        key: group.label,
        label: group.label,
        lithologies: group.liths.map(toLithology),
      })
    );
  }

  return h("div.lm-lith-results", [h(Notices, { notices: data.notices }), body]);
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
