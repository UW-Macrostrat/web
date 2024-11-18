import { PageContext } from "vike/types";
import { Project, tableSelect } from "@macrostrat-web/column-builder";

export async function data(ctx: PageContext) {
  const { data, error } = await tableSelect("projects");
  const projects: Project[] = data ? data : [{}];

  const errors = [error].filter((e) => e != null);
  return { projects, errors };
}
