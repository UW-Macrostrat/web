import { fetchAllProjects } from "~/_utils/fetch-helpers";
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
import {
  COLUMN_STATUS_FILTER_KEY,
  parseStatusCodeParam,
} from "~/components/in-process-filter";
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
  const projects = await fetchAllProjects();
  const rawProjectFilter = pageContext.urlParsed?.search?.project_id ?? null;
  const projectSlugs = parseProjectFilter(rawProjectFilter);
  const projectIDs = resolveProjectIDs(projects, projectSlugs);
  const project_id = projectIDParam(projectIDs);

  // The shared in-process filter travels as the API's own argument,
  // `?status_code=active,in process`; unset means `active` alone, so the
  // default stays out of the URL. Parsed here so the server renders the same
  // list the client would request — including for a link that arrives with the
  // filter already on.
  const rawStatusCode =
    pageContext.urlParsed?.search?.[COLUMN_STATUS_FILTER_KEY] ?? null;
  const showInProcess = parseStatusCodeParam(rawStatusCode);

  // Whether the *URL* said anything about the scope, as distinct from what it
  // resolved to — an absent `status_code` and one naming only `active` both
  // mean "off" here, but only the first should defer to the scope carried from
  // the previous column page (`~/components/column-scope`).
  const urlScope = {
    project: rawProjectFilter != null,
    inProcess: rawStatusCode != null,
  };

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
    urlScope,
    startAfter,
    pageLocation,
  };
}
