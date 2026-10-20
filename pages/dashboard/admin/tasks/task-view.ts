/** A task's page: its parameters and Run button in a panel above the output
 * area. On a run's page the panel starts from that run's parameters and the
 * area shows its terminal; on the task's own page it waits for a run. */
import hyper from "@macrostrat/hyper";
import { Button, Callout, Card, Intent } from "@blueprintjs/core";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { navigate } from "vike/client/router";
import { formatDateTime } from "../api";
import {
  fetchRun,
  fetchRuns,
  isLive,
  killRun,
  type Run,
  runURL,
  startRun,
  type TaskInfo,
} from "./api";
import { CancelButton, elapsed, StateTag, useNow } from "./runs";
import { defaultValues, SchemaForm } from "./schema-form";
import { useTaskInfo } from "./task-title";
import { RunTerminal } from "./terminal";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function TaskView({
  taskName,
  runId = null,
}: {
  taskName: string;
  runId?: string | null;
}) {
  const { task, error } = useTaskInfo(taskName);
  const { run, error: runError, refresh } = useRun(runId);

  if (error != null) return h(Callout, { intent: Intent.DANGER }, error);
  if (runError != null) return h(Callout, { intent: Intent.DANGER }, runError);
  if (task == null || (runId != null && run == null)) {
    return h("p.muted", "Loading…");
  }

  return h("div.tasks-page", [
    h(TaskPanel, { task, run, onChange: refresh }),
    h(OutputArea, { task, run, onEnd: refresh }),
  ]);
}

function useRun(runId: string | null) {
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (runId == null) return;
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

function TaskPanel({
  task,
  run,
  onChange,
}: {
  task: TaskInfo;
  run: Run | null;
  onChange(): void;
}) {
  const [values, setValues] = useState(
    () => run?.params ?? defaultValues(task.params_schema)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const started = await startRun(task.name, values);
      navigate(runURL(started));
    } catch (e: any) {
      setError(e?.message ?? "Could not start the run");
    } finally {
      setBusy(false);
    }
  }

  let form: ReactNode = null;
  if (Object.keys(task.params_schema.properties ?? {}).length > 0) {
    form = h(SchemaForm, {
      schema: task.params_schema,
      values,
      onChange: setValues,
    });
  }

  let errorNode: ReactNode = null;
  if (error != null) {
    errorNode = h(Callout, { intent: Intent.DANGER }, error);
  }

  return h(Card, { className: "task-panel" }, [
    h("p.task-description", task.description),
    form,
    errorNode,
    h("div.panel-footer", [
      h(
        Button,
        {
          icon: "play",
          intent: Intent.PRIMARY,
          loading: busy,
          disabled: run != null && isLive(run),
          onClick: submit,
        },
        "Run"
      ),
      h(RunStatus, { run, onChange }),
    ]),
  ]);
}

function RunStatus({ run, onChange }: { run: Run | null; onChange(): void }) {
  const live = run != null && isLive(run);
  const now = useNow(live);
  if (run == null) return null;

  let actions: ReactNode = null;
  if (live) {
    actions = h("div.run-actions", [
      h(CancelButton, { run, onDone: onChange }),
      h(KillButton, { run, onDone: onChange }),
    ]);
  }

  const details = [
    run.requested_by_name,
    formatDateTime(run.started_on ?? run.created_on),
    elapsed(run, now),
  ].filter(Boolean);

  return h("div.run-status", [
    h(StateTag, { state: run.state }),
    h("span.muted.run-details", details.join(" · ")),
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

function OutputArea({
  task,
  run,
  onEnd,
}: {
  task: TaskInfo;
  run: Run | null;
  onEnd(): void;
}) {
  if (run == null) return h(OutputPlaceholder, { task });
  return h("div.task-output", [
    h(RunOutcome, { run }),
    h(RunTerminal, { runId: run.id, onEnd }),
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

function OutputPlaceholder({ task }: { task: TaskInfo }) {
  const last = useLastRun(task.name);
  let lastNode: ReactNode = null;
  if (last != null) {
    lastNode = h("p", [
      "Last run: ",
      h("a", { href: runURL(last) }, formatDateTime(last.created_on)),
      " ",
      h(StateTag, { state: last.state }),
    ]);
  }
  return h("div.output-placeholder", [
    h("p.muted", "The run's output appears here."),
    lastNode,
  ]);
}

function useLastRun(taskName: string): Run | null {
  const [last, setLast] = useState<Run | null>(null);
  useEffect(() => {
    fetchRuns()
      .then((runs) => setLast(runs.find((r) => r.task === taskName) ?? null))
      .catch(() => setLast(null));
  }, [taskName]);
  return last;
}
