import h from "@macrostrat/hyper";
import { usePageContext } from "vike-react/usePageContext";
import { TaskView } from "../../task-view";

export function Page() {
  const ctx = usePageContext();
  const taskName = String(ctx.routeParams.task);
  const runId = String(ctx.routeParams.run);
  return h(TaskView, { key: runId, taskName, runId });
}
