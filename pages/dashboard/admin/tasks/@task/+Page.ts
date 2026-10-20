import h from "@macrostrat/hyper";
import { usePageContext } from "vike-react/usePageContext";
import { TaskView } from "../task-view";

export function Page() {
  const ctx = usePageContext();
  const taskName = String(ctx.routeParams.task);
  return h(TaskView, { key: taskName, taskName });
}
