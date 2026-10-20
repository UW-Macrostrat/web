/** A task's title for the breadcrumbs, from the catalog once it has loaded. */
import h from "@macrostrat/hyper";
import { useEffect, useState } from "react";
import { fetchCatalog, type TaskInfo } from "./api";

export function useTaskInfo(name: string) {
  const [task, setTask] = useState<TaskInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchCatalog()
      .then((tasks) => {
        const found = tasks.find((t) => t.name === name);
        if (found == null) {
          setError(`No task named ${name}`);
          return;
        }
        setTask(found);
        setError(null);
      })
      .catch((e) => setError(e?.message ?? "Could not load the task"));
  }, [name]);
  return { task, error };
}

export function TaskTitle({ name }: { name: string }) {
  const { task } = useTaskInfo(name);
  return task?.title ?? name;
}

export function taskPageInfo(ctx: any) {
  const name = String(ctx.routeParams?.task ?? "");
  const title = () => h(TaskTitle, { name });
  return { name, title, shortTitle: title };
}
