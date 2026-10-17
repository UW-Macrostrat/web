import { fetchAPIData } from "~/_utils";

/** Where each of Sift's routes (`/sift/<type>/<id>`) lives now. Sift was
 * retired in favor of the lexicon; its links survive in papers and bookmarks. */
const itemRoutes: Record<string, string> = {
  strat_name: "/lex/strat-names",
  strat_name_concept: "/lex/strat-concepts",
  interval: "/lex/intervals",
  lithology: "/lex/lithologies",
  environment: "/lex/environments",
  economic: "/lex/economics",
  column: "/columns",
};

// Types and classes are levels of the lexicon's hierarchy pages.
const hierarchyRoutes: Record<string, string> = {
  lithology_type: "/lex/lithologies",
  lithology_class: "/lex/lithologies",
  environment_type: "/lex/environments",
  environment_class: "/lex/environments",
  economic_type: "/lex/economics",
  economic_class: "/lex/economics",
};

// Sift's `/definitions/<category>` lists, keyed as its autocomplete named them.
const definitionRoutes: Record<string, string> = {
  columns: "/columns",
  groups: "/projects",
  intervals: "/lex/intervals",
  strat_name_concepts: "/lex/strat-concepts",
  strat_name_orphans: "/lex/strat-names",
  lithologies: "/lex/lithologies",
  lithology_types: "/lex/lithologies",
  lithology_classes: "/lex/lithologies",
  environments: "/lex/environments",
  environment_types: "/lex/environments",
  environment_classes: "/lex/environments",
  enviornment_classes: "/lex/environments",
  econs: "/lex/economics",
  econ_types: "/lex/economics",
  econ_classes: "/lex/economics",
};

const fallbackRoute = "/lex";

export async function legacySiftTarget(path: string): Promise<string> {
  const [type, id] = path.split("/").filter((part) => part !== "");
  if (type == null) return fallbackRoute;
  if (type == "definitions") return definitionRoutes[id] ?? fallbackRoute;
  if (type in hierarchyRoutes) return hierarchyRoutes[type];
  if (id == null) return fallbackRoute;
  if (type in itemRoutes) return `${itemRoutes[type]}/${id}`;
  if (type == "unit") return await unitTarget(id);
  if (type == "group") return await groupTarget(id);
  return fallbackRoute;
}

async function unitTarget(id: string): Promise<string> {
  const [unit] = await fetchAPIData("/units", {
    unit_id: id,
    response: "short",
  }).catch(() => []);
  if (unit?.col_id == null) return fallbackRoute;
  return `/columns/${unit.col_id}#unit=${id}`;
}

async function groupTarget(id: string): Promise<string> {
  const [group] = await fetchAPIData("/defs/groups", {
    col_group_id: id,
  }).catch(() => []);
  if (group?.project_id == null) return "/projects";
  return `/projects/${group.project_id}/groups/${id}`;
}
