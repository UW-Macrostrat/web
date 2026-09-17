import { fetchAPIData } from "~/_utils/fetch-helpers";
import {
  parseProjectFilter,
  projectIDParam,
  resolveProjectIDs,
} from "~/components/project-filter/model";
import {
  columnRequestParams,
  DEFAULT_REQUEST_SCOPE,
  getGroupedColumns,
} from "./grouped-cols.ts";
import { IN_PROCESS_FILTER_KEY } from "~/components/in-process-filter";
import {
  parseStartAfter,
  START_AFTER_KEY,
  type PageLocation,
} from "./page-links.ts";

export async function data(pageContext) {
  // The project definitions come first: the list's section headers need names,
  // and the shared project filter (`?project_id=`, slugs) has to be resolved to
  // the numeric ids the API takes. Unset means the API's default, the "Core
  // columns" composite — what the column and correlation maps show too.
  const projects = await fetchAPIData("/defs/projects", { all: true });
  const projectSlugs = parseProjectFilter(
    pageContext.urlParsed?.search?.project_id ?? null
  );
  const projectIDs = resolveProjectIDs(projects, projectSlugs);
  const project_id = projectIDParam(projectIDs);

  // The shared in-process filter travels as `?in_process=true`; unset means
  // off, so the default stays out of the URL. Parsed here so the server renders
  // the same list the client would request — including for a link that arrives
  // with the filter already on.
  const showInProcess =
    (pageContext.urlParsed?.search?.[IN_PROCESS_FILTER_KEY] ?? null) === "true";

  // Built with the same function as the page's own request, and returned with
  // the result, so the page can tell the seeded data is exactly what it would
  // fetch first and skip that request.
  const requestParams = columnRequestParams({
    ...DEFAULT_REQUEST_SCOPE,
    projectID: project_id,
    showInProcess,
  });
  const allColumnGroups = await getGroupedColumns(requestParams);

  // Crawlable paging: `?after=<col_id>` starts the list after that column. The
  // page's location is kept so the panel's page links stay on this URL (same
  // project and search parameters, a different cursor).
  const search: Record<string, string> = pageContext.urlParsed?.search ?? {};
  const startAfter = parseStartAfter(search[START_AFTER_KEY]);
  const pageLocation: PageLocation = {
    pathname: pageContext.urlParsed?.pathname ?? "/columns",
    search,
  };

  return {
    allColumnGroups,
    requestParams,
    projects,
    projectSlugs,
    project_id,
    showInProcess,
    startAfter,
    pageLocation,
  };
}
