import { NextRouter } from "next/router";
import pg from "../../db";
import { QueryI, CrumbsI } from "./base-page";

export interface IdsFromColGroup {
  project_id?: number;
}

async function fetchIdsFromColGroup(
  col_group_id: number
): Promise<IdsFromColGroup> {
  const { data, error } = await pg
    .from("col_groups")
    .select("project_id")
    .match({ id: col_group_id });
  if (data) {
    return data[0];
  }
  return {};
}

export interface IdsFromUnit {
  unit_id?: number;
  section_id?: number;
  col_id?: number;
  project_id?: number;
}

async function fetchIdsFromUnitId(unit_id: number): Promise<IdsFromUnit> {
  const { data, error } = await pg
    .from("units")
    .select("section_id, cols!units_col_id_fkey(id, project_id)")
    .match({ id: unit_id });

  if (data) {
    const { section_id, cols } = data[0];
    const { id: col_id, project_id } = cols;
    return { section_id, col_id, project_id, unit_id };
  }
  return {};
}

export interface IdsFromSection {
  col_id?: number;
  section_id?: number;
  project_id?: number;
}

async function fetchIdsFromSectionId(
  section_id: number
): Promise<IdsFromSection> {
  const { data, error } = await pg
    .from("sections")
    .select("cols!sections_col_id_fkey(id, project_id)")
    .match({ id: section_id });

  if (data) {
    const { id: col_id, project_id } = data[0]["cols"];
    return { col_id, project_id, section_id };
  }
  return {};
}

export interface IdsFromCol {
  col_id?: number;
  project_id?: number;
}

async function fetchIdsFromColId(col_id: number): Promise<IdsFromCol> {
  const { data, error } = await pg
    .from("cols")
    .select("project_id")
    .match({ id: col_id });

  if (data) {
    return { ...data[0], col_id };
  }
  return {};
}

interface BreadCrumbsHookI {
  query: QueryI;
  router: NextRouter;
}
function useBreadCrumbs(props: BreadCrumbsHookI) {
  const { query, router } = props;

  const filterCrumbs = (obj: CrumbsI): boolean => {
    if (obj.text == "Projects") {
      return true;
    }

    if (!(obj.predicate in query)) return false;
    return true;
  };

  const breadCrumbs: CrumbsI[] = [
    {
      text: "Projects",
      onClick: async () => {
        router.push("/");
      },
      predicate: "",
    },
    {
      text: "Column Groups",
      onClick: async () => {
        router.push(`/column-groups/${query.project_id}`);
      },
      predicate: "project_id",
    },
    {
      text: "Column",
      onClick: async () => {
        router.push(`/column/${query.col_id}`);
      },
      predicate: "col_id",
    },
    {
      text: "Section",
      onClick: async () => {
        router.push(`/section/${query.section_id}`);
      },
      predicate: "section_id",
    },
    {
      text: "Unit",
      onClick: async () => {
        router.push(`/unit/${query.unit_id}/edit`);
      },
      predicate: "unit_id",
    },
  ].filter(filterCrumbs);

  return breadCrumbs;
}

export {
  fetchIdsFromColId,
  fetchIdsFromSectionId,
  fetchIdsFromUnitId,
  fetchIdsFromColGroup,
  useBreadCrumbs,
};
