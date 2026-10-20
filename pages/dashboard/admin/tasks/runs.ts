/** Runs: their state, how long they have been going, and the table of them. */
import hyper from "@macrostrat/hyper";
import {
  AnchorButton,
  Button,
  HTMLTable,
  Intent,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "../api";
import {
  cancelRun,
  fetchRuns,
  isLive,
  type Run,
  type RunState,
  runURL,
} from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const intents: Record<RunState, Intent> = {
  queued: Intent.NONE,
  running: Intent.PRIMARY,
  succeeded: Intent.SUCCESS,
  failed: Intent.DANGER,
  cancelled: Intent.WARNING,
  killed: Intent.DANGER,
};

export function StateTag({ state }: { state: RunState }) {
  let icon = null;
  if (state === "running") icon = h(Spinner, { size: 12 });
  return h(Tag, { minimal: true, intent: intents[state], icon }, state);
}

/** A timestamp that ticks every second while `active`. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/** How long the run has been going, or took: from its start to its end or now. */
export function elapsed(run: Run, now: number): string {
  const start =
    run.started_on ?? (run.state === "queued" ? null : run.created_on);
  if (start == null) return "";
  const end =
    run.finished_on != null ? new Date(run.finished_on).getTime() : now;
  return formatDuration(Math.max(0, end - new Date(start).getTime()));
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const h_ = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h_ > 0) return `${h_}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** The recent runs, refreshed every few seconds while one is live. */
export function useRuns() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setRuns(await fetchRuns());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load runs");
    }
  }, []);
  const live = runs.some(isLive);
  useEffect(() => {
    refresh();
    if (!live) return;
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [refresh, live]);
  return { runs, error, refresh };
}

export function RunsTable({
  runs,
  now,
  onChange,
}: {
  runs: Run[];
  now: number;
  onChange(): void;
}) {
  if (runs.length === 0) return h("p.muted", "No runs yet.");
  return h(
    HTMLTable,
    { className: "runs-table", compact: true, striped: true },
    [
      h("thead", [
        h("tr", [
          h("th", "Task"),
          h("th", "State"),
          h("th", "Requested by"),
          h("th", "Started"),
          h("th", "Elapsed"),
          h("th", ""),
        ]),
      ]),
      h(
        "tbody",
        runs.map((run) => h(RunRow, { key: run.id, run, now, onChange }))
      ),
    ]
  );
}

function RunRow({
  run,
  now,
  onChange,
}: {
  run: Run;
  now: number;
  onChange(): void;
}) {
  let cancel = null;
  if (isLive(run)) {
    cancel = h(CancelButton, { run, onDone: onChange, minimal: true });
  }
  return h("tr", [
    h("td", h("a", { href: runURL(run.id) }, run.task)),
    h("td", h(StateTag, { state: run.state })),
    h("td", run.requested_by_name ?? ""),
    h("td", formatDateTime(run.started_on ?? run.created_on)),
    h("td.elapsed", elapsed(run, now)),
    h("td.actions", [
      h(
        AnchorButton,
        { href: runURL(run.id), icon: "console", minimal: true, small: true },
        "Output"
      ),
      cancel,
    ]),
  ]);
}

export function CancelButton({
  run,
  onDone,
  minimal = false,
}: {
  run: Run;
  onDone(): void;
  minimal?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  async function cancel() {
    setBusy(true);
    try {
      await cancelRun(run.id);
      onDone();
    } finally {
      setBusy(false);
    }
  }
  return h(
    Button,
    {
      icon: "stop",
      intent: Intent.WARNING,
      minimal,
      small: minimal,
      loading: busy,
      onClick: cancel,
    },
    "Cancel"
  );
}
