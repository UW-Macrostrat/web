/** Management tasks: run `topo update` and its relatives on the worker,
 * unattended, with live output — never a shell. The catalog and the runs
 * come from api_v3's admin-gated `/tasks`; each task opens its own page.
 */
import hyper from "@macrostrat/hyper";
import { Callout, Intent } from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import { type ReactNode, useEffect, useState } from "react";
import { LinkCard } from "~/components";
import { isDegraded } from "~/components/auth";
import {
  fetchCatalog,
  isLive,
  type TaskInfo,
  taskURL,
  TaskServiceUnavailable,
} from "./api";
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
    h(Catalog, { catalog }),
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
    fetchCatalog()
      .then((tasks) => setState({ tasks, error: null, unavailable: false }))
      .catch((e) => {
        const unavailable = e instanceof TaskServiceUnavailable;
        setState({ tasks: null, error: e?.message ?? "", unavailable });
      });
  }, []);
  return state;
}

function Catalog({ catalog }: { catalog: CatalogState }) {
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
    catalog.tasks.map((task) => h(TaskCard, { key: task.name, task }))
  );
}

function TaskCard({ task }: { task: TaskInfo }) {
  return h(
    LinkCard,
    { href: taskURL(task.name), title: task.title, density: "list" },
    [
      h("p.task-description", task.description),
      h("span.task-name.muted", task.name),
    ]
  );
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
