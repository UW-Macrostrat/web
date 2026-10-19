import type { PageInfo } from "~/components/navigation/breadcrumbs/utils";

/** The project crumb. On a nested page the data is that page's, and on an
 * error page there is none — so the route's own segment is the fallback,
 * rather than a crash that turns every 404 under a project into a 500. */
export function pageInfo(pageContext: any): PageInfo {
  const project = pageContext?.data?.project;
  if (project != null) {
    return { name: project.project, identifier: project.project_id };
  }
  return { name: String(pageContext?.routeParams?.project ?? "Project") };
}
