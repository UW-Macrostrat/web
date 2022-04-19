import pg from "../../db";
import { QueryI } from "..";

async function getIdHierarchy(query: QueryI) {
  // could be col_id,section_id, unit_id
  const { project_id, col_id, section_id, unit_id, col_group_id } = query;

  if (typeof col_id !== "undefined") {
    return await fetchIdsFromColId(col_id);
  } else if (typeof section_id !== "undefined") {
    return await fetchIdsFromSectionId(section_id);
  } else if (typeof unit_id !== "undefined") {
    return await fetchIdsFromUnitId(unit_id);
  } else if (typeof col_group_id !== "undefined") {
    return await fetchIdsFromColGroup(col_group_id);
  }

  return query;
}

async function fetchIdsFromColGroup(col_group_id: number) {
  const { data, error } = await pg
    .from("col_groups")
    .select("project_id")
    .match({ id: col_group_id });
  if (data) {
    return data[0];
  }
  return {};
}

async function fetchIdsFromUnitId(unit_id: number) {
  const { data, error } = await pg
    .from("units")
    .select("section_id, cols!units_col_id_fkey1(id, project_id)")
    .match({ id: unit_id });

  if (data) {
    const { section_id, cols } = data[0];
    const { id: col_id, project_id } = cols;
    return { section_id, col_id, project_id, unit_id };
  }
  return {};
}

async function fetchIdsFromSectionId(section_id: number) {
  const { data, error } = await pg
    .from("sections")
    .select("cols!sections_col_id_fkey1(id, project_id)")
    .match({ id: section_id });

  if (data) {
    const { id: col_id, project_id } = data[0]["cols"];
    return { col_id, project_id, section_id };
  }
  return {};
}

async function fetchIdsFromColId(col_id: number) {
  const { data, error } = await pg
    .from("cols")
    .select("project_id")
    .match({ id: col_id });

  if (data) {
    return { ...data[0], col_id };
  }
  return {};
}

export { getIdHierarchy };
