/** Management tasks: run `topo update` and its relatives on the worker,
 * unattended, with live output — never a shell. The catalog and the runs
 * come from api_v3's admin-gated `/tasks`; a run opens its own page.
 */
import hyper from "@macrostrat/hyper";
import {
  Button,
  Callout,
  Card,
  Dialog,
  DialogBody,
  DialogFooter,
  Intent,
} from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import { type ReactNode, useEffect, useState } from "react";
import { navigate } from "vike/client/router";
import { isDegraded } from "~/components/auth";
import {
  fetchTasks,
  isLive,
  runURL,
  startRun,
  type TaskInfo,
  TaskServiceUnavailable,
} from "./api";
import { defaultValues, SchemaForm } from "./schema-form";
import { RunsTable, useNow, useRuns } from "./runs";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  const { user } = useAuth();
  const degraded = isDegraded(user);
  const catalog = useCatalog();
  const { runs, error: runsError, refresh } = useRuns();
  const now = useNow(runs.some(isLive));

  if (degraded) {
    return h("div.tasks-page", [
      h(
        Callout,
        { intent: Intent.WARNING, icon: "eye-open" },
        "Restore your role on the admin page to run tasks."
      ),
    ]);
  }

  return h("div.tasks-page", [
    h(
      Section,
      {
        title: "Tasks",
        description:
          "Each task runs on the worker with its terminal output streamed here. One run of a task at a time.",
      },
      [h(Catalog, { catalog, onStarted: refresh })]
    ),
    h(Section, { title: "Runs" }, [
      h.if(runsError != null)("p.error", runsError),
      h(RunsTable, { runs, now, onChange: refresh }),
    ]),
  ]);
}

interface CatalogState {
  tasks: TaskInfo[] | null;
  error: string | null;
  unavailable: boolean;
}

function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({
    tasks: null,
    error: null,
    unavailable: false,
  });
  useEffect(() => {
    fetchTasks()
      .then((tasks) => setState({ tasks, error: null, unavailable: false }))
      .catch((e) => {
        const unavailable = e instanceof TaskServiceUnavailable;
        setState({ tasks: null, error: e?.message ?? "", unavailable });
      });
  }, []);
  return state;
}

function Catalog({
  catalog,
  onStarted,
}: {
  catalog: CatalogState;
  onStarted(): void;
}) {
  if (catalog.unavailable) {
    return h(
      Callout,
      { intent: Intent.WARNING, icon: "offline" },
      "Task service unavailable: this API has no task runner."
    );
  }
  if (catalog.error != null) return h("p.error", catalog.error);
  if (catalog.tasks == null) return h("p.muted", "Loading…");
  return h(
    "div.task-cards",
    catalog.tasks.map((task) =>
      h(TaskCard, { key: task.name, task, onStarted })
    )
  );
}

function TaskCard({ task, onStarted }: { task: TaskInfo; onStarted(): void }) {
  const [isOpen, setOpen] = useState(false);
  return h(Card, { className: "task-card" }, [
    h("h3", task.title),
    h("span.task-name.muted", task.name),
    h("p", task.description),
    h(
      Button,
      { icon: "play", intent: Intent.PRIMARY, onClick: () => setOpen(true) },
      "Run…"
    ),
    h(RunDialog, {
      task,
      isOpen,
      onClose: () => setOpen(false),
      onStarted,
    }),
  ]);
}

function RunDialog({
  task,
  isOpen,
  onClose,
  onStarted,
}: {
  task: TaskInfo;
  isOpen: boolean;
  onClose(): void;
  onStarted(): void;
}) {
  const [values, setValues] = useState(() => defaultValues(task.params_schema));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const run = await startRun(task.name, values);
      onStarted();
      onClose();
      navigate(runURL(run.id));
    } catch (e: any) {
      setError(e?.message ?? "Could not start the run");
    } finally {
      setBusy(false);
    }
  }

  let errorNode: ReactNode = null;
  if (error != null) {
    errorNode = h(Callout, { intent: Intent.DANGER }, error);
  }

  return h(Dialog, { isOpen, onClose, title: task.title, icon: "play" }, [
    h(DialogBody, [
      h("p.muted", task.description),
      h(SchemaForm, {
        schema: task.params_schema,
        values,
        onChange: setValues,
      }),
      errorNode,
    ]),
    h(DialogFooter, {
      actions: h([
        h(Button, { onClick: onClose }, "Cancel"),
        h(
          Button,
          {
            intent: Intent.PRIMARY,
            icon: "play",
            loading: busy,
            onClick: submit,
          },
          "Start"
        ),
      ]),
    }),
  ]);
}

function Section({
  title,
  description = null,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return h("section.tasks-section", [
    h("div.section-header", [
      h("h2", title),
      h.if(description != null)("p.muted", description),
    ]),
    children,
  ]);
}
