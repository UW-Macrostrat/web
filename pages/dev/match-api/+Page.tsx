import { useState } from "react";
import "./match-api.css";
import { apiV2Prefix, apiV3Prefix } from "@macrostrat-web/settings";
/*
 * Match API console
 * -----------------
 * Interactive UI for GET /api/v3/dev/match/strat-names.
 *
 * The form mirrors the server-side validation so an invalid query can't be
 * built: exactly one name source, and location by coordinates OR column id.
 * The request is made from the browser on submit (not in an SSR data() hook),
 * so it uses the browser's trust store and avoids the Node self-signed-cert
 * issue when talking to the local Caddy gateway.
 */

const MATCH_ENDPOINT = `${apiV3Prefix}/dev/match/strat-names`;

// v2 endpoints used by "Generate example" to pull a real column + its units.
const COLUMNS_ENDPOINT = `${apiV2Prefix}/defs/columns`;
const UNITS_ENDPOINT = `${apiV2Prefix}/units`;

// Macrostrat col_id space to sample from when generating a random example.
const MAX_COL_ID = 5747;
// Safety cap so a run of invalid/empty columns can't loop forever.
const MAX_EXAMPLE_ATTEMPTS = 40;

// External SIFT column page (opens in a new tab) for a returned col_id.
const siftColumnUrl = (colId: number | string) =>
  `https://web-legacy.development.svc.macrostrat.org/sift/#/column/${colId}`;

type MatchMode = "strat_name" | "concept_name" | "strat_name_id" | "concept_id";
type LocMode = "coords" | "col_id";

interface MatchMessage {
  message: string;
  details?: string | null;
  type?: "info" | "warning" | "error";
}

interface MatchResultRow {
  strat_name_id?: number;
  strat_name?: string;
  strat_rank?: string;
  parent_id?: number;
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

interface MatchData {
  unit_matches: MatchResultRow[];
  messages: MatchMessage[];
}

interface MatchResponse {
  version: string;
  date_accessed: string;
  results: MatchData[];
  name_bases: string[];
  messages: MatchMessage[] | null;
}

const NAME_BASIS_STYLE: Record<string, { bg: string; fg: string; bd: string }> = {
  exact: { bg: "#e7f6ec", fg: "#1a7f3c", bd: "#bce5c8" },
  concept: { bg: "#e7f0fb", fg: "#1f5fb0", bd: "#c2d8f3" },
  "rank-up": { bg: "#efeafb", fg: "#6b46c1", bd: "#d8cdf2" },
  "rank-down": { bg: "#fdf1e3", fg: "#b06b16", bd: "#f3ddbf" },
  synonym: { bg: "#eef1f4", fg: "#55657a", bd: "#d6dde4" },
};

const PRESETS: { label: string; apply: (s: FormState) => FormState }[] = [
  {
    label: "Navajo — by name",
    apply: (s) => ({
      ...s,
      matchMode: "strat_name",
      strat_name: "Navajo",
      locMode: "coords",
      lat: "35.951",
      lng: "-109.905",
      priority: "strat_name",
      all: false,
    }),
  },
  {
    label: "Navajo — location priority",
    apply: (s) => ({
      ...s,
      matchMode: "strat_name",
      strat_name: "Navajo",
      locMode: "coords",
      lat: "35.951",
      lng: "-109.905",
      priority: "location",
      all: true,
    }),
  },
  {
    label: "Mancos — column 490",
    apply: (s) => ({
      ...s,
      matchMode: "strat_name",
      strat_name: "Mancos",
      locMode: "col_id",
      col_id: "490",
      all: true,
    }),
  },
];

interface FormState {
  matchMode: MatchMode;
  strat_name: string;
  concept_name: string;
  strat_name_id: string;
  concept_id: string;
  locMode: LocMode;
  lat: string;
  lng: string;
  col_id: string;
  project_id: string;
  b_age: string;
  t_age: string;
  interval: string;
  b_interval: string;
  t_interval: string;
  priority: "strat_name" | "location";
  all: boolean;
}

const INITIAL: FormState = {
  matchMode: "strat_name",
  strat_name: "Navajo",
  concept_name: "",
  strat_name_id: "",
  concept_id: "",
  locMode: "coords",
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

function buildUrl(s: FormState): string {
  const p = new URLSearchParams();

  // Name source — exactly one, set by matchMode.
  if (s.matchMode === "strat_name") {
    if (!s.strat_name.trim()) throw new Error("Enter a stratigraphic name to match.");
    p.set("strat_name", s.strat_name.trim());
  } else if (s.matchMode === "concept_name") {
    if (!s.concept_name.trim()) throw new Error("Enter a concept name to match.");
    p.set("concept_name", s.concept_name.trim());
  } else if (s.matchMode === "strat_name_id") {
    if (!s.strat_name_id.trim()) throw new Error("Enter a stratigraphic name ID.");
    p.set("strat_name_id", s.strat_name_id.trim());
  } else {
    if (!s.concept_id.trim()) throw new Error("Enter a concept ID.");
    p.set("concept_id", s.concept_id.trim());
  }

  // Location — coordinates or column id.
  if (s.locMode === "coords") {
    if (!s.lat.trim() || !s.lng.trim())
      throw new Error("Latitude and longitude are both required.");
    p.set("lat", s.lat.trim());
    p.set("lng", s.lng.trim());
  } else {
    if (!s.col_id.trim()) throw new Error("Enter a column ID.");
    p.set("col_id", s.col_id.trim());
  }
  if (s.project_id.trim()) p.set("project_id", s.project_id.trim());

  // Age / interval — all optional.
  if (s.b_age.trim()) p.set("b_age", s.b_age.trim());
  if (s.t_age.trim()) p.set("t_age", s.t_age.trim());
  if (s.interval.trim()) p.set("interval", s.interval.trim());
  if (s.b_interval.trim()) p.set("b_interval", s.b_interval.trim());
  if (s.t_interval.trim()) p.set("t_interval", s.t_interval.trim());

  // Options.
  p.set("priority", s.priority);
  if (s.all) p.set("all", "true");

  return `${MATCH_ENDPOINT}?${p.toString()}`;
}

function Badge({ basis }: { basis?: string }) {
  if (!basis) return null;
  const c = NAME_BASIS_STYLE[basis] ?? NAME_BASIS_STYLE.synonym;
  return (
    <span
      className="mc-badge"
      style={{ background: c.bg, color: c.fg, borderColor: c.bd }}
    >
      {basis}
    </span>
  );
}

function fmtAge(t?: number, b?: number) {
  if (t == null && b == null) return "—";
  const r = (n?: number) => (n == null ? "?" : Math.round(n * 100) / 100);
  return `${r(t)} – ${r(b)} Ma`;
}

// Highlight the matched name word-by-word against the user's query text:
// green = word the user supplied, yellow = word the lexicon added.
// With no text query (ID-based searches) the name renders plainly.
function HighlightedName({ name, query }: { name: string; query: string }) {
  const inputTokens = new Set(
    query.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)
  );
  if (inputTokens.size === 0) return <>{name}</>;
  const parts = name.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.trim() === "") return part;
        const norm = part.toLowerCase().replace(/[^a-z0-9]+/gi, "");
        const matched = norm.length > 0 && inputTokens.has(norm);
        return (
          <span key={i} className={matched ? "mc-tok-match" : "mc-tok-nomatch"}>
            {part}
          </span>
        );
      })}
    </>
  );
}

function Messages({ messages }: { messages?: MatchMessage[] | null }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div className="mc-messages">
      {messages.map((m, i) => (
        <div key={i} className={`mc-message mc-message-${m.type ?? "info"}`}>
          <strong>{m.message}</strong>
          {m.details ? <div className="mc-message-detail">{m.details}</div> : null}
        </div>
      ))}
    </div>
  );
}

function MatchCard({ row, query }: { row: MatchResultRow; query: string }) {
  const name = row.strat_name ?? "(unnamed)";
  const colUrl = row.col_id != null ? siftColumnUrl(row.col_id) : null;
  return (
    <li className="mc-card">
      <div className="mc-card-rank" title="Priority (0 = best)">
        {row.priority ?? "—"}
      </div>
      <div className="mc-card-main">
        <div className="mc-card-title">
          {colUrl ? (
            <a
              className="mc-name mc-name-link"
              href={colUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open column ${row.col_id} in SIFT`}
            >
              <HighlightedName name={name} query={query} />
            </a>
          ) : (
            <span className="mc-name">
              <HighlightedName name={name} query={query} />
            </span>
          )}
          {row.strat_rank ? <span className="mc-rank">{row.strat_rank}</span> : null}
        </div>
        <div className="mc-card-badges">
          <Badge basis={row.name_basis} />
          {row.spatial_basis ? (
            <span
              className={`mc-spatial ${
                row.spatial_basis === "containing column"
                  ? "mc-spatial-containing"
                  : "mc-spatial-adjacent"
              }`}
            >
              {row.spatial_basis}
            </span>
          ) : null}
          {row.concept_name ? (
            <span className="mc-concept">concept: {row.concept_name}</span>
          ) : null}
        </div>
        <div className="mc-card-ids">
          <span><strong>strat_name_id</strong> {row.strat_name_id ?? "—"}</span>
          <span><strong>unit_id</strong> {row.unit_id ?? "—"}</span>
          <span><strong>col_id</strong> {row.col_id ?? "—"}</span>
          {row.concept_id != null ? (
            <span><strong>concept_id</strong> {row.concept_id}</span>
          ) : null}
          {row.depth != null ? (
            <span><strong>depth</strong> {row.depth}</span>
          ) : null}
          {row.t_age != null ? (
            <span><strong>t_age</strong> {row.t_age}</span>
          ) : null}
          {row.b_age != null ? (
            <span><strong>b_age</strong> {row.b_age}</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function MatchApiConsole() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [matchedAgainst, setMatchedAgainst] = useState("");
  const [generating, setGenerating] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Pre-populate the form from a real, randomly chosen Macrostrat column.
  //
  // Loop: pick a random col_id in [1, MAX_COL_ID], confirm it's an active
  // column (v2 /defs/columns must return a non-empty data array), then pull
  // its units (v2 /units?response=long). If we find a unit with a
  // strat_name_long and centroid coords (clat/clng), drop those into the
  // Stratigraphic name + Latitude/Longitude fields and stop. Otherwise keep
  // sampling. Capped at MAX_EXAMPLE_ATTEMPTS so it can't spin forever.
  async function generateExample() {
    setError(null);
    setGenerating(true);
    try {
      for (let attempt = 0; attempt < MAX_EXAMPLE_ATTEMPTS; attempt++) {
        const colId = Math.floor(Math.random() * MAX_COL_ID) + 1; // 1..MAX_COL_ID

        // 1) Is this an active column?
        const colUrl = `${COLUMNS_ENDPOINT}?col_id=${colId}&status=active`;
        const colRes = await fetch(colUrl, {
          headers: { Accept: "application/json" },
        });
        if (!colRes.ok) continue;
        const colBody = await colRes.json().catch(() => null);
        const cols = colBody?.success?.data;
        if (!Array.isArray(cols) || cols.length === 0) continue; // invalid → retry

        // 2) Pull this column's units.
        const unitsUrl = `${UNITS_ENDPOINT}?col_id=${colId}&response=long`;
        const unitsRes = await fetch(unitsUrl, {
          headers: { Accept: "application/json" },
        });
        if (!unitsRes.ok) continue;
        const unitsBody = await unitsRes.json().catch(() => null);
        const units = unitsBody?.success?.data;
        if (!Array.isArray(units) || units.length === 0) continue;

        // 3) Keep units that have a usable name + coordinates.
        const usable = units.filter(
          (u: any) =>
            u &&
            typeof u.strat_name_long === "string" &&
            u.strat_name_long.trim() &&
            u.clat != null &&
            u.clng != null
        );
        if (usable.length === 0) continue; // valid column, but nothing to fill → retry

        // 4) Pick one at random and populate the form.
        const pick = usable[Math.floor(Math.random() * usable.length)];
        setForm((f) => ({
          ...f,
          matchMode: "strat_name",
          strat_name: String(pick.strat_name_long).trim(),
          locMode: "coords",
          lat: String(pick.clat),
          lng: String(pick.clng),
        }));
        setData(null);
        setLastUrl(null);
        return;
      }

      setError(
        `Couldn't find a random column with a usable stratigraphic name after ${MAX_EXAMPLE_ATTEMPTS} tries. Please try again.`
      );
    } catch (e: any) {
      setError(
        e?.message?.includes("Failed to fetch")
          ? "Couldn't reach the API while generating an example. Check that it's running and its certificate is trusted by your browser."
          : e?.message ?? "Failed to generate an example."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function runMatch() {
    setError(null);
    let url: string;
    try {
      url = buildUrl(form);
    } catch (e: any) {
      setError(e.message);
      return;
    }
    setLastUrl(url);
    setMatchedAgainst(
      form.matchMode === "strat_name"
        ? form.strat_name
        : form.matchMode === "concept_name"
        ? form.concept_name
        : ""
    );
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          body && body.detail ? JSON.stringify(body.detail) : res.statusText;
        throw new Error(`Request failed (${res.status}): ${detail}`);
      }
      setData(body as MatchResponse);
    } catch (e: any) {
      setError(
        e?.message?.includes("Failed to fetch")
          ? "Couldn't reach the API. Check that it's running and its certificate is trusted by your browser."
          : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  const totalMatches =
    data?.results.reduce((n, r) => n + r.unit_matches.length, 0) ?? 0;

  return (
    <div className="match-console">
        <p className="mc-intro">
          Match stratigraphic name text against the Macrostrat lexicon and
          columns. Pick what to match and where, then run the query.
        </p>

        <div className="mc-presets">
          <span className="mc-presets-label">Try:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="mc-chip"
              onClick={() => {
                setForm((f) => preset.apply(f));
                setError(null);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mc-grid">
          {/* ---- Query builder ---- */}
          <section className="mc-panel" aria-label="Query parameters">
            <h3 className="mc-h3">What to match</h3>
            <div className="mc-seg">
              {(
                [
                  ["strat_name", "Strat name"],
                  ["concept_name", "Concept name"],
                  ["strat_name_id", "Strat name ID"],
                  ["concept_id", "Concept ID"],
                ] as [MatchMode, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`mc-seg-btn ${form.matchMode === val ? "is-active" : ""}`}
                  onClick={() => set("matchMode", val)}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.matchMode === "strat_name" && (
              <Field label="Stratigraphic name" hint="Use ; to match several at once">
                <input
                  className="mc-input"
                  value={form.strat_name}
                  placeholder="Navajo Sandstone; Kayenta Formation"
                  onChange={(e) => set("strat_name", e.target.value)}
                />
              </Field>
            )}
            {form.matchMode === "concept_name" && (
              <Field label="Concept name">
                <input
                  className="mc-input"
                  value={form.concept_name}
                  placeholder="Navajo"
                  onChange={(e) => set("concept_name", e.target.value)}
                />
              </Field>
            )}
            {form.matchMode === "strat_name_id" && (
              <Field label="Stratigraphic name ID">
                <input
                  className="mc-input"
                  type="number"
                  value={form.strat_name_id}
                  placeholder="3361"
                  onChange={(e) => set("strat_name_id", e.target.value)}
                />
              </Field>
            )}
            {form.matchMode === "concept_id" && (
              <Field label="Concept ID">
                <input
                  className="mc-input"
                  type="number"
                  value={form.concept_id}
                  placeholder="9491"
                  onChange={(e) => set("concept_id", e.target.value)}
                />
              </Field>
            )}

            <h3 className="mc-h3">Where</h3>
            <div className="mc-seg">
              {(
                [
                  ["coords", "Coordinates"],
                  ["col_id", "Column ID"],
                ] as [LocMode, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`mc-seg-btn ${form.locMode === val ? "is-active" : ""}`}
                  onClick={() => set("locMode", val)}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.locMode === "coords" ? (
              <div className="mc-row">
                <Field label="Latitude">
                  <input
                    className="mc-input"
                    type="number"
                    value={form.lat}
                    placeholder="35.951"
                    onChange={(e) => set("lat", e.target.value)}
                  />
                </Field>
                <Field label="Longitude">
                  <input
                    className="mc-input"
                    type="number"
                    value={form.lng}
                    placeholder="-109.905"
                    onChange={(e) => set("lng", e.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <Field label="Column ID">
                <input
                  className="mc-input"
                  type="number"
                  value={form.col_id}
                  placeholder="490"
                  onChange={(e) => set("col_id", e.target.value)}
                />
              </Field>
            )}

            <h3 className="mc-h3">Priority ordering</h3>
            <div className="mc-seg">
              {(
                [
                  ["strat_name", "By strat name"],
                  ["location", "By location"],
                ] as ["strat_name" | "location", string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`mc-seg-btn ${form.priority === val ? "is-active" : ""}`}
                  onClick={() => set("priority", val)}
                >
                  {label}
                </button>
              ))}
            </div>

            <details className="mc-details">
              <summary>Optional parameters</summary>

              <Field label="Project ID" hint="Limit to a Macrostrat project">
                <input
                  className="mc-input"
                  type="number"
                  value={form.project_id}
                  placeholder="optional"
                  onChange={(e) => set("project_id", e.target.value)}
                />
              </Field>

              <h3 className="mc-h3">Age &amp; interval</h3>
              <div className="mc-row">
                <Field label="Lower age (b_age, Ma)">
                  <input
                    className="mc-input"
                    type="number"
                    value={form.b_age}
                    onChange={(e) => set("b_age", e.target.value)}
                  />
                </Field>
                <Field label="Upper age (t_age, Ma)">
                  <input
                    className="mc-input"
                    type="number"
                    value={form.t_age}
                    onChange={(e) => set("t_age", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Interval" hint="Name or ID, e.g. Triassic">
                <input
                  className="mc-input"
                  value={form.interval}
                  onChange={(e) => set("interval", e.target.value)}
                />
              </Field>
              <div className="mc-row">
                <Field label="Lower interval (b_interval)">
                  <input
                    className="mc-input"
                    value={form.b_interval}
                    onChange={(e) => set("b_interval", e.target.value)}
                  />
                </Field>
                <Field label="Upper interval (t_interval)">
                  <input
                    className="mc-input"
                    value={form.t_interval}
                    onChange={(e) => set("t_interval", e.target.value)}
                  />
                </Field>
              </div>
            </details>

            <label className="mc-check">
              <input
                type="checkbox"
                checked={form.all}
                onChange={(e) => set("all", e.target.checked)}
              />
              Return all matches (not just the best per query)
            </label>

            <div className="mc-actions">
              <button
                type="button"
                className="mc-run"
                onClick={runMatch}
                disabled={loading}
              >
                {loading ? "Matching…" : "Match names"}
              </button>
              <button
                type="button"
                className="mc-reset"
                onClick={generateExample}
                disabled={generating || loading}
                title="Pick a random Macrostrat column and fill in its stratigraphic name and coordinates"
              >
                {generating ? "Generating…" : "Generate example"}
              </button>
              <button
                type="button"
                className="mc-reset"
                onClick={() => {
                  setForm(INITIAL);
                  setData(null);
                  setError(null);
                  setLastUrl(null);
                  setMatchedAgainst("");
                }}
              >
                Reset
              </button>
            </div>
          </section>

          {/* ---- Results ---- */}
          <section className="mc-panel mc-results" aria-label="Results" aria-live="polite">
            <div className="mc-results-head">
              <h3 className="mc-h3">Results</h3>
              {data ? (
                <span className="mc-count">
                  {totalMatches} match{totalMatches === 1 ? "" : "es"}
                  {" · "}
                  {data.results.length} quer{data.results.length === 1 ? "y" : "ies"}
                </span>
              ) : null}
            </div>

            {lastUrl ? (
              <code className="mc-url" title={lastUrl}>
                {lastUrl}
              </code>
            ) : null}

            {error ? <div className="mc-error">{error}</div> : null}
            {loading ? <p className="mc-muted">Matching…</p> : null}

            {!loading && !error && !data ? (
              <p className="mc-muted">
                Set your parameters and choose <strong>Match names</strong> to see
                ranked unit matches here.
              </p>
            ) : null}

            {data ? (
              <>
                <Messages messages={data.messages} />

                {data.name_bases?.length ? (
                  <div className="mc-namebases">
                    {data.name_bases.map((nb) => (
                      <Badge key={nb} basis={nb} />
                    ))}
                  </div>
                ) : null}

                {data.results.map((result, i) => (
                  <div key={i} className="mc-result">
                    <Messages messages={result.messages} />
                    {result.unit_matches.length === 0 ? (
                      <p className="mc-muted">No matches for this query.</p>
                    ) : (
                      <ul className="mc-cards">
                        {result.unit_matches.map((row, j) => (
                          <MatchCard key={j} row={row} query={matchedAgainst} />
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="mc-rawtoggle"
                  onClick={() => setShowRaw((v) => !v)}
                >
                  {showRaw ? "Hide raw JSON" : "Show raw JSON"}
                </button>
                {showRaw ? (
                  <pre className="mc-raw">{JSON.stringify(data, null, 2)}</pre>
                ) : null}

                <div className="mc-meta">
                  v{data.version} · accessed {data.date_accessed}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mc-field">
      <span className="mc-label">
        {label}
        {hint ? <span className="mc-hint"> · {hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
