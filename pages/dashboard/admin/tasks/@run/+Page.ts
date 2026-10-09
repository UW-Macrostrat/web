/** One run: its parameters, state and timings, the buttons that end it, and
 * its terminal output, live or archived. */
import hyper from "@macrostrat/hyper";
import { AnchorButton, Button, Callout, Intent } from "@blueprintjs/core";
import { DataField } from "@macrostrat/data-components";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { formatDateTime } from "../../api";
import { fetchRun, isLive, killRun, type Run } from "../api";
import { CancelButton, elapsed, StateTag, useNow } from "../runs";
import { RunTerminal } from "../terminal";
import styles from "../main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  const ctx = usePageContext();
  const runId = String(ctx.routeParams.run ?? "");
  const { run, error, refresh } = useRun(runId);
  const live = run != null && isLive(run);
  const now = useNow(live);

  if (error != null) {
    return h("div.tasks-page", [
      h(Callout, { intent: Intent.DANGER }, error),
      h(BackLink),
    ]);
  }
  if (run == null) return h("div.tasks-page", h("p.muted", "Loading…"));

  return h("div.tasks-page", [
    h(RunHeader, { run, onChange: refresh }),
    h(RunFields, { run, now }),
    h(RunOutcome, { run }),
    h(RunTerminal, { runId, onEnd: refresh }),
    h("p", h(BackLink)),
  ]);
}

function useRun(runId: string) {
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (runId === "") return;
    try {
      setRun(await fetchRun(runId));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load the run");
    }
  }, [runId]);
  const live = run != null && isLive(run);
  useEffect(() => {
    refresh();
    if (!live) return;
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh, live]);
  return { run, error, refresh };
}

function RunHeader({ run, onChange }: { run: Run; onChange(): void }) {
  let actions: ReactNode = null;
  if (isLive(run)) {
    actions = h("div.run-actions", [
      h(CancelButton, { run, onDone: onChange }),
      h(KillButton, { run, onDone: onChange }),
    ]);
  }
  return h("div.run-header", [
    h("h2", run.task),
    h(StateTag, { state: run.state }),
    actions,
  ]);
}

function KillButton({ run, onDone }: { run: Run; onDone(): void }) {
  const [busy, setBusy] = useState(false);
  async function kill() {
    if (
      !window.confirm("Kill the worker process? Cancel first if it responds.")
    )
      return;
    setBusy(true);
    try {
      await killRun(run.id);
      onDone();
    } finally {
      setBusy(false);
    }
  }
  return h(
    Button,
    {
      icon: "cross",
      intent: Intent.DANGER,
      minimal: true,
      loading: busy,
      onClick: kill,
    },
    "Kill"
  );
}

function RunFields({ run, now }: { run: Run; now: number }) {
  const params = JSON.stringify(run.params, null, 2);
  return h("div.run-fields", [
    h(DataField, {
      row: true,
      label: "Requested by",
      value: run.requested_by_name,
    }),
    h(DataField, {
      row: true,
      label: "Queued",
      value: formatDateTime(run.created_on),
    }),
    h(DataField, {
      row: true,
      label: "Started",
      value: formatDateTime(run.started_on),
    }),
    h(DataField, {
      row: true,
      label: "Finished",
      value: formatDateTime(run.finished_on),
    }),
    h(DataField, { row: true, label: "Elapsed", value: elapsed(run, now) }),
    h(DataField, {
      row: true,
      label: "Parameters",
      value: h("pre.run-json", params),
    }),
  ]);
}

function RunOutcome({ run }: { run: Run }) {
  if (run.error != null) {
    return h(Callout, { intent: Intent.DANGER, title: "Error" }, run.error);
  }
  if (run.result != null) {
    return h("pre.run-json", JSON.stringify(run.result, null, 2));
  }
  return null;
}

function BackLink() {
  return h(
    AnchorButton,
    { href: "/dashboard/admin/tasks", icon: "arrow-left", minimal: true },
    "All tasks"
  );
}
