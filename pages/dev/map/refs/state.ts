import { atom } from "jotai";

import { atomWithSearchParam } from "~/_utils/url-atoms";

import { problemsOf, type Reference } from "./api";

/** Seeded by `HybridPage`'s `initialAtoms` from the server-side fetch. */
export const refsAtom = atom<Reference[]>([]);

const selectedParamAtom = atomWithSearchParam("ref");

export const selectedIdAtom = atom(
  (get) => {
    const id = parseInt(get(selectedParamAtom) ?? "");
    if (!Number.isFinite(id)) return null;
    return id;
  },
  (get, set, id: number | null) => set(selectedParamAtom, id?.toString() ?? null)
);

export const selectedRefAtom = atom((get) => {
  const id = get(selectedIdAtom);
  if (id == null) return null;
  return get(refsAtom).find((r) => r.id === id) ?? null;
});

export const searchAtom = atom("");

/** Most references have no geometry, so the list starts with those that do. */
const allParamAtom = atomWithSearchParam("all");
export const showAllAtom = atom(
  (get) => get(allParamAtom) === "on",
  (get, set, value: boolean) => set(allParamAtom, value ? "on" : null)
);

const problemsParamAtom = atomWithSearchParam("problems");
export const onlyProblemsAtom = atom(
  (get) => get(problemsParamAtom) === "on",
  (get, set, value: boolean) => set(problemsParamAtom, value ? "on" : null)
);

export const visibleRefsAtom = atom((get) => {
  const showAll = get(showAllAtom);
  const onlyProblems = get(onlyProblemsAtom);
  const search = get(searchAtom).trim().toLowerCase();

  return get(refsAtom).filter((r) => {
    if (!showAll && r.geom_type == null) return false;
    if (onlyProblems && !hasGeometryProblem(r)) return false;
    if (search === "") return true;
    const text = `${r.id} ${r.author} ${r.ref} ${r.pub_year}`.toLowerCase();
    return text.includes(search);
  });
});

function hasGeometryProblem(ref: Reference) {
  return problemsOf(ref).some((p) => p.intent !== "none");
}
