/** `/lex/match/strat-names`: match a stratigraphic name against the lexicon
 * and the columns at a place, and see the units it resolves to, ranked, with
 * the basis for each — the same answer `GET /dev/match/strat-names` gives the
 * column importer.
 *
 * The form mirrors the server's validation so an invalid query can't be
 * built: exactly one name source, and a location by coordinates or by column.
 * Requests go from the browser on submit, not from a data hook. */
import { useCallback, useState, type ReactNode } from "react";
import {
  Button,
  Collapse,
  FormGroup,
  InputGroup,
  SegmentedControl,
  Switch,
  Tag,
  type Intent,
} from "@blueprintjs/core";
import { apiV2Prefix, apiV3Prefix } from "@macrostrat-web/settings";
import { Link } from "~/components";
import { PointMap, type MapPoint } from "./point-map";
import {
  describeFetchError,
  ErrorNotice,
  h,
  MatchPage,
  Muted,
  Notices,
  Panel,
  Presets,
  type MatchNotice,
} from "../console";

const MATCH_ENDPOINT = `${apiV3Prefix}/dev/match/strat-names`;

// "Generate example" pulls a real column and one of its units from the v2 API.
const COLUMNS_ENDPOINT = `${apiV2Prefix}/defs/columns`;
const UNITS_ENDPOINT = `${apiV2Prefix}/units`;
/** The column id space to sample from, and how many misses to tolerate. */
const MAX_COL_ID = 5747;
const MAX_EXAMPLE_ATTEMPTS = 40;

type MatchMode = "strat_name" | "concept_name" | "strat_name_id" | "concept_id";
type LocationMode = "coords" | "col_id";
type Priority = "strat_name" | "location";

interface MatchResultRow {
  strat_name_id?: number;
  strat_name?: string;
  strat_rank?: string;
  concept_name?: string;
  concept_id?: number;
  unit_id?: number;
  col_id?: number;
  project_id?: number;
  depth?: number;
  name_basis?: string;
  spatial_basis?: string;
  t_age?: number;
  b_age?: number;
  priority?: number;
}

interface MatchResponse {
  version: string;
  date_accessed: string;
  results: { unit_matches: MatchResultRow[]; messages: MatchNotice[] }[];
  name_bases: string[];
  messages: MatchNotice[] | null;
}

interface FormState {
  matchMode: MatchMode;
  strat_name: string;
  concept_name: string;
  strat_name_id: string;
  concept_id: string;
  locationMode: LocationMode;
  lat: string;
  lng: string;
  col_id: string;
  project_id: string;
  b_age: string;
  t_age: string;
  interval: string;
  b_interval: string;
  t_interval: string;
  priority: Priority;
  all: boolean;
}

const INITIAL: FormState = {
  matchMode: "strat_name",
  strat_name: "Navajo",
  concept_name: "",
  strat_name_id: "",
  concept_id: "",
  locationMode: "coords",
  lat: "35.951",
  lng: "-109.905",
  col_id: "",
  project_id: "",
  b_age: "",
  t_age: "",
  interval: "",
  b_interval: "",
  t_interval: "",
  priority: "strat_name",
  all: false,
};

const PRESETS: { label: string; value: Partial<FormState> }[] = [
  {
    label: "Navajo, by name",
    value: {
      matchMode: "strat_name",
      strat_name: "Navajo",
      locationMode: "coords",
      lat: "35.951",
      lng: "-109.905",
      priority: "strat_name",
      all: false,
    },
  },
  {
    label: "Navajo, location first",
    value: {
      matchMode: "strat_name",
      strat_name: "Navajo",
      locationMode: "coords",
      lat: "35.951",
      lng: "-109.905",
      priority: "location",
      all: true,
    },
  },
  {
    label: "Mancos in column 490",
    value: {
      matchMode: "strat_name",
      strat_name: "Mancos",
      locationMode: "col_id",
      col_id: "490",
      all: true,
    },
  },
];

const MATCH_MODES = [
  { label: "Name", value: "strat_name" },
  { label: "Concept", value: "concept_name" },
  { label: "Name ID", value: "strat_name_id" },
  { label: "Concept ID", value: "concept_id" },
];

const LOCATION_MODES = [
  { label: "Coordinates", value: "coords" },
  { label: "Column", value: "col_id" },
];

const PRIORITIES = [
  { label: "The name", value: "strat_name" },
  { label: "The location", value: "location" },
];

/** How a match was made, as a tag intent. */
const NAME_BASIS_INTENT: Record<string, Intent> = {
  exact: "success",
  concept: "primary",
  "rank-up": "warning",
  "rank-down": "warning",
  synonym: "none",
};

/** The request for a form, or the reason there can't be one. */
function buildURL(s: FormState): string {
  const p = new URLSearchParams();
  const need = (value: string, message: string) => {
    if (!value.trim()) throw new Error(message);
    return value.trim();
  };

  if (s.matchMode === "strat_name") {
    p.set("strat_name", need(s.strat_name, "Enter a stratigraphic name."));
  } else if (s.matchMode === "concept_name") {
    p.set("concept_name", need(s.concept_name, "Enter a concept name."));
  } else if (s.matchMode === "strat_name_id") {
    p.set("strat_name_id", need(s.strat_name_id, "Enter a name ID."));
  } else {
    p.set("concept_id", need(s.concept_id, "Enter a concept ID."));
  }

  if (s.locationMode === "coords") {
    p.set("lat", need(s.lat, "Latitude and longitude are both needed."));
    p.set("lng", need(s.lng, "Latitude and longitude are both needed."));
  } else {
    p.set("col_id", need(s.col_id, "Enter a column ID."));
  }

  for (const key of [
    "project_id",
    "b_age",
    "t_age",
    "interval",
    "b_interval",
    "t_interval",
  ] as const) {
    if (s[key].trim()) p.set(key, s[key].trim());
  }
  p.set("priority", s.priority);
  if (s.all) p.set("all", "true");
  return `${MATCH_ENDPOINT}?${p.toString()}`;
}

export function Page() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lastURL, setLastURL] = useState<string | null>(null);
  const [matchedAgainst, setMatchedAgainst] = useState("");

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    []
  );

  const applyPreset = useCallback((value: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...value }));
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setForm(INITIAL);
    setData(null);
    setError(null);
    setLastURL(null);
    setMatchedAgainst("");
  }, []);

  const runMatch = useCallback(async () => {
    setError(null);
    let url: string;
    try {
      url = buildURL(form);
    } catch (e: any) {
      setError(e.message);
      return;
    }
    setLastURL(url);
    let against = "";
    if (form.matchMode === "strat_name") against = form.strat_name;
    if (form.matchMode === "concept_name") against = form.concept_name;
    setMatchedAgainst(against);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = body?.detail
          ? JSON.stringify(body.detail)
          : res.statusText;
        throw new Error(`The request failed (${res.status}): ${detail}`);
      }
      setData(body as MatchResponse);
    } catch (e) {
      setError(describeFetchError(e, "The match couldn't be completed."));
    } finally {
      setLoading(false);
    }
  }, [form]);

  const generateExample = useCallback(async () => {
    setError(null);
    setGenerating(true);
    try {
      const example = await randomExample();
      if (example == null) {
        setError(
          `No column with a usable stratigraphic name turned up in ${MAX_EXAMPLE_ATTEMPTS} tries. Try again.`
        );
        return;
      }
      setForm((f) => ({ ...f, ...example }));
      setData(null);
      setLastURL(null);
    } catch (e) {
      setError(describeFetchError(e, "An example couldn't be generated."));
    } finally {
      setGenerating(false);
    }
  }, []);

  return h(MatchPage, {
    lead: "Match a stratigraphic name against Macrostrat's lexicon and the columns at a place. Say what to match and where, and see the units it resolves to, ranked, with the basis for each.",
    presets: h(Presets, { items: PRESETS, onPick: applyPreset }),
    query: h(QueryPanel, {
      form,
      set,
      loading,
      generating,
      onRun: runMatch,
      onExample: generateExample,
      onReset: reset,
    }),
    results: h(ResultsPanel, { data, error, loading, lastURL, matchedAgainst }),
  });
}

/* ------------------------------------------------------------ the query */

function QueryPanel({
  form,
  set,
  loading,
  generating,
  onRun,
  onExample,
  onReset,
}) {
  const [showOptional, setShowOptional] = useState(false);
  const onEnter = (evt) => {
    if (evt.key === "Enter") onRun();
  };

  // A click on the map is a choice of coordinates, whatever mode was showing.
  const onPick = useCallback(
    (point: MapPoint) => {
      set("locationMode", "coords");
      set("lat", String(point.lat));
      set("lng", String(point.lng));
    },
    [set]
  );

  let optionalLabel = "Optional parameters…";
  if (showOptional) optionalLabel = "Hide optional parameters";

  return h(Panel, { title: "What to match" }, [
    h(SegmentedControl, {
      options: MATCH_MODES,
      value: form.matchMode,
      small: true,
      onValueChange: (v: MatchMode) => set("matchMode", v),
    }),
    h(NameField, { form, set, onEnter }),
    h("h3", "Where"),
    h(SegmentedControl, {
      options: LOCATION_MODES,
      value: form.locationMode,
      small: true,
      onValueChange: (v: LocationMode) => set("locationMode", v),
    }),
    h(LocationFields, { form, set, onEnter }),
    h(PointMap, { point: formPoint(form), onPick }),
    h(
      FormGroup,
      {
        label: "Rank by",
        helperText:
          "Whether the best match is the closest name or the closest column.",
      },
      h(SegmentedControl, {
        options: PRIORITIES,
        value: form.priority,
        small: true,
        onValueChange: (v: Priority) => set("priority", v),
      })
    ),
    h(Switch, {
      checked: form.all,
      label: "Return every match, not only the best for each query",
      onChange: (e) => set("all", e.currentTarget.checked),
    }),
    h(
      "button.optional-toggle",
      { type: "button", onClick: () => setShowOptional((v) => !v) },
      optionalLabel
    ),
    h(
      Collapse,
      { isOpen: showOptional },
      h(OptionalFields, { form, set, onEnter })
    ),
    h("div.actions", [
      h(Button, {
        intent: "primary",
        icon: "search",
        text: "Match",
        loading,
        onClick: onRun,
      }),
      h(Button, {
        icon: "random",
        text: "Generate example",
        loading: generating,
        disabled: loading,
        title:
          "Fill the form from a random Macrostrat column: one of its names and its coordinates",
        onClick: onExample,
      }),
      h(Button, { minimal: true, text: "Reset", onClick: onReset }),
    ]),
  ]);
}

function NameField({ form, set, onEnter }) {
  const mode: MatchMode = form.matchMode;
  if (mode === "strat_name") {
    return h(
      FormGroup,
      {
        label: "Stratigraphic name",
        helperText: "Separate several names with a semicolon.",
      },
      h(InputGroup, {
        value: form.strat_name,
        placeholder: "Navajo Sandstone; Kayenta Formation",
        onValueChange: (v) => set("strat_name", v),
        onKeyDown: onEnter,
      })
    );
  }
  if (mode === "concept_name") {
    return h(
      FormGroup,
      { label: "Concept name" },
      h(InputGroup, {
        value: form.concept_name,
        placeholder: "Navajo",
        onValueChange: (v) => set("concept_name", v),
        onKeyDown: onEnter,
      })
    );
  }
  if (mode === "strat_name_id") {
    return h(
      FormGroup,
      { label: "Stratigraphic name ID" },
      h(InputGroup, {
        type: "number",
        value: form.strat_name_id,
        placeholder: "3361",
        onValueChange: (v) => set("strat_name_id", v),
        onKeyDown: onEnter,
      })
    );
  }
  return h(
    FormGroup,
    { label: "Concept ID" },
    h(InputGroup, {
      type: "number",
      value: form.concept_id,
      placeholder: "9491",
      onValueChange: (v) => set("concept_id", v),
      onKeyDown: onEnter,
    })
  );
}

function LocationFields({ form, set, onEnter }) {
  if (form.locationMode === "coords") {
    return h("div.field-row", [
      h(
        FormGroup,
        { label: "Latitude" },
        h(InputGroup, {
          type: "number",
          value: form.lat,
          placeholder: "35.951",
          onValueChange: (v) => set("lat", v),
          onKeyDown: onEnter,
        })
      ),
      h(
        FormGroup,
        { label: "Longitude" },
        h(InputGroup, {
          type: "number",
          value: form.lng,
          placeholder: "-109.905",
          onValueChange: (v) => set("lng", v),
          onKeyDown: onEnter,
        })
      ),
    ]);
  }
  return h(
    FormGroup,
    { label: "Column ID" },
    h(InputGroup, {
      type: "number",
      value: form.col_id,
      placeholder: "490",
      onValueChange: (v) => set("col_id", v),
      onKeyDown: onEnter,
    })
  );
}

function OptionalFields({ form, set, onEnter }) {
  const field = (key: keyof FormState, label: string, props = {}) =>
    h(
      FormGroup,
      { label, ...props },
      h(InputGroup, {
        value: form[key],
        onValueChange: (v) => set(key, v),
        onKeyDown: onEnter,
      })
    );
  return h("div.optional", [
    field("project_id", "Project ID", {
      helperText: "Only columns in this project.",
    }),
    h("div.field-row", [
      field("b_age", "Oldest age (Ma)"),
      field("t_age", "Youngest age (Ma)"),
    ]),
    field("interval", "Interval", {
      helperText: "A name or an ID: Triassic, 32.",
    }),
    h("div.field-row", [
      field("b_interval", "Oldest interval"),
      field("t_interval", "Youngest interval"),
    ]),
  ]);
}

/** The coordinates the form holds, when it is matching by coordinates and
 * both are numbers. */
function formPoint(form: FormState): MapPoint | null {
  if (form.locationMode !== "coords") return null;
  const lat = parseFloat(form.lat);
  const lng = parseFloat(form.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** A real column and one of its named units, for the form. Columns are
 * sampled at random until one has a unit with a name and coordinates. */
async function randomExample(): Promise<Partial<FormState> | null> {
  for (let attempt = 0; attempt < MAX_EXAMPLE_ATTEMPTS; attempt++) {
    const colID = Math.floor(Math.random() * MAX_COL_ID) + 1;
    const colRes = await fetch(
      `${COLUMNS_ENDPOINT}?col_id=${colID}&status=active`
    );
    if (!colRes.ok) continue;
    const cols = (await colRes.json().catch(() => null))?.success?.data;
    if (!Array.isArray(cols) || cols.length === 0) continue;

    const unitsRes = await fetch(
      `${UNITS_ENDPOINT}?col_id=${colID}&response=long`
    );
    if (!unitsRes.ok) continue;
    const units = (await unitsRes.json().catch(() => null))?.success?.data;
    if (!Array.isArray(units)) continue;
    const usable = units.filter(
      (u) =>
        typeof u?.strat_name_long === "string" &&
        u.strat_name_long.trim() &&
        u.clat != null &&
        u.clng != null
    );
    if (usable.length === 0) continue;

    const pick = usable[Math.floor(Math.random() * usable.length)];
    return {
      matchMode: "strat_name",
      strat_name: String(pick.strat_name_long).trim(),
      locationMode: "coords",
      lat: String(pick.clat),
      lng: String(pick.clng),
    };
  }
  return null;
}

/* ---------------------------------------------------------- the results */

function ResultsPanel({ data, error, loading, lastURL, matchedAgainst }) {
  let aside: ReactNode = null;
  if (data != null) {
    const total = data.results.reduce((n, r) => n + r.unit_matches.length, 0);
    const queries = data.results.length;
    aside = h(
      "span.count",
      `${total} match${total === 1 ? "" : "es"} · ${queries} quer${
        queries === 1 ? "y" : "ies"
      }`
    );
  }

  let request: ReactNode = null;
  if (lastURL != null)
    request = h("code.request-url", { title: lastURL }, lastURL);

  let body: ReactNode = null;
  if (loading) {
    body = h(Muted, "Matching…");
  } else if (data != null) {
    body = h(MatchResults, { data, query: matchedAgainst });
  } else if (error == null) {
    body = h(
      Muted,
      "Set the query and choose Match to see the ranked units here."
    );
  }

  return h(Panel, { title: "Results", aside, "aria-live": "polite" }, [
    request,
    h(ErrorNotice, { error }),
    body,
  ]);
}

function MatchResults({ data, query }: { data: MatchResponse; query: string }) {
  const [showRaw, setShowRaw] = useState(false);

  let bases: ReactNode = null;
  if (data.name_bases?.length) {
    bases = h(
      "div.name-bases",
      data.name_bases.map((basis) => h(BasisTag, { key: basis, basis }))
    );
  }

  let rawLabel = "Show raw JSON";
  if (showRaw) rawLabel = "Hide raw JSON";

  return h("div.results-body", [
    h(Notices, { notices: data.messages }),
    bases,
    data.results.map((result, i) => h(ResultGroup, { key: i, result, query })),
    h(
      "button.optional-toggle",
      { type: "button", onClick: () => setShowRaw((v) => !v) },
      rawLabel
    ),
    h(
      Collapse,
      { isOpen: showRaw },
      h("pre.raw-json", JSON.stringify(data, null, 2))
    ),
    h("div.meta", `Matcher v${data.version} · ${data.date_accessed}`),
  ]);
}

function ResultGroup({ result, query }) {
  let list: ReactNode = h(Muted, "No matches for this query.");
  if (result.unit_matches.length > 0) {
    list = h(
      "ul.match-list",
      result.unit_matches.map((row, j) => h(MatchRow, { key: j, row, query }))
    );
  }
  return h("div.results-body", [
    h(Notices, { notices: result.messages }),
    list,
  ]);
}

function BasisTag({ basis }: { basis?: string }) {
  if (!basis) return null;
  return h(
    Tag,
    { minimal: true, intent: NAME_BASIS_INTENT[basis] ?? "none" },
    basis
  );
}

/** One matched unit: the name as the lexicon has it, how it was matched, and
 * the ids it resolves to, linked to their pages. */
function MatchRow({ row, query }: { row: MatchResultRow; query: string }) {
  const name = row.strat_name ?? "(unnamed)";

  let title: ReactNode = h(
    "span.match-name",
    h(HighlightedName, { name, query })
  );
  if (row.strat_name_id != null) {
    title = h(
      Link,
      {
        className: "match-name",
        href: `/lex/strat-names/${row.strat_name_id}`,
      },
      h(HighlightedName, { name, query })
    );
  }

  let rank: ReactNode = null;
  if (row.strat_rank) rank = h(Tag, { minimal: true }, row.strat_rank);

  let spatial: ReactNode = null;
  if (row.spatial_basis) {
    let intent: Intent = "none";
    if (row.spatial_basis === "containing column") intent = "success";
    spatial = h(
      Tag,
      { minimal: true, intent, icon: "map-marker" },
      row.spatial_basis
    );
  }

  let concept: ReactNode = null;
  if (row.concept_name) {
    concept = h(
      Tag,
      { minimal: true, icon: "graph" },
      `concept: ${row.concept_name}`
    );
  }

  return h("li.match-row", [
    h("div.match-rank", { title: "Priority (0 is best)" }, row.priority ?? "—"),
    h("div.match-main", [
      h("div.match-title", [title, rank]),
      h("div.match-tags", [
        h(BasisTag, { basis: row.name_basis }),
        spatial,
        concept,
      ]),
      h("div.match-ids", [
        h(IDField, {
          label: "column",
          value: row.col_id,
          href: columnHref(row),
        }),
        h(IDField, { label: "unit", value: row.unit_id }),
        h(IDField, {
          label: "concept",
          value: row.concept_id,
          href: conceptHref(row.concept_id),
        }),
        h(IDField, { label: "depth", value: row.depth }),
        h(IDField, { label: "age", value: formatAges(row.t_age, row.b_age) }),
      ]),
    ]),
  ]);
}

function columnHref(row: MatchResultRow): string | null {
  if (row.col_id == null) return null;
  if (row.project_id != null && row.project_id !== 1) {
    return `/columns/${row.col_id}#project_id=${row.project_id}`;
  }
  return `/columns/${row.col_id}`;
}

function conceptHref(id: number | undefined): string | null {
  if (id == null) return null;
  return `/lex/strat-concepts/${id}`;
}

function IDField({ label, value, href = null }) {
  if (value == null) return null;
  let body: ReactNode = String(value);
  if (href != null) body = h(Link, { href }, String(value));
  return h("span", [h("strong", label), body]);
}

function formatAges(t?: number, b?: number): string | null {
  if (t == null && b == null) return null;
  const r = (n?: number) => (n == null ? "?" : Math.round(n * 100) / 100);
  return `${r(t)}–${r(b)} Ma`;
}

/** The matched name word by word: the reader's words marked, the lexicon's
 * additions set back. With no text query (an ID search) the name is plain. */
function HighlightedName({ name, query }: { name: string; query: string }) {
  const given = new Set(
    query
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
  );
  if (given.size === 0) return h("span", name);
  return h(
    "span",
    name.split(/(\s+)/).map((part, i) => {
      if (part.trim() === "") return part;
      const norm = part.toLowerCase().replace(/[^a-z0-9]+/gi, "");
      let cls = "tok-added";
      if (norm.length > 0 && given.has(norm)) cls = "tok-match";
      return h("span", { key: i, className: cls }, part);
    })
  );
}
