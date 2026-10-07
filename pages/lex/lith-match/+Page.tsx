import { useEffect, useState } from "react";
import "./lith-match.css";
import { apiV2Prefix, apiV3Prefix } from "@macrostrat-web/settings";
import { Tag } from "@macrostrat/data-components";
/*
 * Lith match console
 * ------------------
 * Interactive UI for GET /api/v3/dev/match/liths.
 *
 * Runs the column-ingestion lithology matcher (LithsProcessor) over free text —
 * the same parse `ingest_columns_from_file` runs on a unit's lithology column —
 * and shows the lithologies it recognises, with attributes, abundance and
 * proportion, plus any notices. The request is made from the browser on submit
 * so it uses the browser's trust store against the local gateway.
 */

const LITH_ENDPOINT = `${apiV3Prefix}/dev/match/liths`;

interface LithAttribute {
  id: number;
  name: string;
  color?: string | null;
}

interface LithMatch {
  id: number;
  name: string;
  color?: string | null;
  attributes: LithAttribute[];
  dom: "dom" | "sub" | null;
  prop: number | null;
}

interface LithNotice {
  level: "info" | "warning" | "error";
  code: string;
  message: string;
  column?: string;
  detail?: Record<string, unknown>;
}

interface LithResponse {
  text: string;
  liths: LithMatch[];
  notices: LithNotice[];
}

const PRESETS: string[] = [
  "sandstone, shale (minor); limestone",
  "cross-bedded fine sandstone and siltstone",
  "dolomitic limestone (60%); chert (40%)",
  "andesitic porphyry",
  "calcareous ooze",
];

const DOM_LABEL: Record<string, string> = { dom: "dominant", sub: "subsidiary" };

function fmtProp(prop: number | null): string | null {
  if (prop == null) return null;
  return `${Math.round(prop * 100)}%`;
}

function LithCard({
  lith,
  attColors,
}: {
  lith: LithMatch;
  attColors: Record<number, string>;
}) {
  const prop = fmtProp(lith.prop);
  return (
    <li className="lm-card">
      <div className="lm-card-main">
        <div className="lm-card-title">
          <Tag name={lith.name} color={lith.color ?? undefined} />
          {lith.dom ? (
            <span className={`lm-dom lm-dom-${lith.dom}`}>
              {DOM_LABEL[lith.dom] ?? lith.dom}
            </span>
          ) : null}
          {prop ? <span className="lm-prop">{prop}</span> : null}
        </div>
        {lith.attributes.length > 0 ? (
          <div className="lm-atts">
            {lith.attributes.map((att) => (
              <Tag
                key={att.id}
                name={att.name}
                color={attColors[att.id] ?? att.color ?? undefined}
              />
            ))}
          </div>
        ) : null}
        <div className="lm-card-ids">
          <span>
            <strong>lith_id</strong> {lith.id}
          </span>
        </div>
      </div>
    </li>
  );
}

function Notices({ notices }: { notices: LithNotice[] }) {
  if (!notices || notices.length === 0) return null;
  return (
    <div className="lm-messages">
      {notices.map((n, i) => (
        <div key={i} className={`lm-message lm-message-${n.level}`}>
          <strong>{n.message}</strong>
          <span className="lm-code"> · {n.code}</span>
        </div>
      ))}
    </div>
  );
}

export default function LithMatchConsole() {
  const [text, setText] = useState(PRESETS[0]);
  const [data, setData] = useState<LithResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [attColors, setAttColors] = useState<Record<number, string>>({});

  // Attribute colors aren't carried on the lith row; read them from the same v2
  // defs the lith-atts lexicon page uses, so matched attributes share its scheme.
  useEffect(() => {
    let cancelled = false;
    fetch(`${apiV2Prefix}/defs/lithology_attributes?all=true`, {
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const data = body?.success?.data;
        if (!Array.isArray(data) || cancelled) return;
        const map: Record<number, string> = {};
        for (const att of data) {
          if (att?.lith_att_id != null && att?.color) {
            map[att.lith_att_id] = att.color;
          }
        }
        setAttColors(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function runMatch() {
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
        const detail =
          body && body.detail ? JSON.stringify(body.detail) : res.statusText;
        throw new Error(`Request failed (${res.status}): ${detail}`);
      }
      setData(body as LithResponse);
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

  const matchCount = data?.liths.length ?? 0;

  return (
    <div className="lith-console">
      <p className="lm-intro">
        Match free lithology text against Macrostrat's lithology vocabulary using
        the column-ingestion matcher — the same parse an ingest runs on a unit's
        lithology column. Enter a lithology description and run it.
      </p>

      <div className="lm-presets">
        <span className="lm-presets-label">Try:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="lm-chip"
            onClick={() => {
              setText(preset);
              setError(null);
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="lm-grid">
        <section className="lm-panel" aria-label="Lithology text">
          <h3 className="lm-h3">Lithology text</h3>
          <textarea
            className="lm-input"
            rows={4}
            value={text}
            placeholder="sandstone, shale (minor); limestone"
            onChange={(e) => setText(e.target.value)}
          />
          <p className="lm-hint">
            Separate lithologies with <code>;</code>, <code>and</code> or{" "}
            <code>or</code>. Add a trailing <code>(60%)</code> or{" "}
            <code>(major)</code> for abundance.
          </p>
          <div className="lm-actions">
            <button
              type="button"
              className="lm-run"
              onClick={runMatch}
              disabled={loading}
            >
              {loading ? "Matching…" : "Match liths"}
            </button>
            <button
              type="button"
              className="lm-reset"
              onClick={() => {
                setText("");
                setData(null);
                setError(null);
                setLastUrl(null);
              }}
            >
              Clear
            </button>
          </div>
        </section>

        <section className="lm-panel lm-results" aria-label="Results" aria-live="polite">
          <div className="lm-results-head">
            <h3 className="lm-h3">Results</h3>
            {data ? (
              <span className="lm-count">
                {matchCount} lith{matchCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          {lastUrl ? (
            <code className="lm-url" title={lastUrl}>
              {lastUrl}
            </code>
          ) : null}

          {error ? <div className="lm-error">{error}</div> : null}
          {loading ? <p className="lm-muted">Matching…</p> : null}

          {!loading && !error && !data ? (
            <p className="lm-muted">
              Enter lithology text and choose <strong>Match liths</strong> to see
              the recognised lithologies here.
            </p>
          ) : null}

          {data ? (
            <>
              <Notices notices={data.notices} />
              {data.liths.length === 0 ? (
                <p className="lm-muted">No lithologies recognised in this text.</p>
              ) : (
                <ul className="lm-cards">
                  {data.liths.map((lith, i) => (
                    <LithCard
                      key={`${lith.id}-${i}`}
                      lith={lith}
                      attColors={attColors}
                    />
                  ))}
                </ul>
              )}

              <button
                type="button"
                className="lm-rawtoggle"
                onClick={() => setShowRaw((v) => !v)}
              >
                {showRaw ? "Hide raw JSON" : "Show raw JSON"}
              </button>
              {showRaw ? (
                <pre className="lm-raw">{JSON.stringify(data, null, 2)}</pre>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
