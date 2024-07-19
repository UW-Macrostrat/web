import { QueryI } from ".";
import { EnvironUnit, LithUnit, StratNameI } from "..";

/* 
returns a list of number ids for the envs or liths to be deleted or 
added from a unit.

Otherwise it's impossible to detect if a user has removed envs or liths
*/
const detectDeletionsAndAdditions = (
  og: EnvironUnit[] | LithUnit[] | StratNameI[],
  changes: EnvironUnit[] | LithUnit[] | StratNameI[]
) => {
  let deletions = new Set<number>();
  let additions = new Set<number>();

  const present_og: any = {};

  og.map((o) => {
    Object.assign(present_og, { [o.id]: true });
  });

  changes.map((c) => {
    let key = c.id;
    if (present_og[key]) {
      delete present_og[key];
    } else {
      additions.add(c.id);
    }
  });
  Object.keys(present_og).map((i) => deletions.add(parseInt(i)));
  return { deletions, additions };
};

/* 
Returns a string url for a next link that creates the query string from 
the passed 'query' object
*/
const createLink = (base: string, query: QueryI) => {
  let queryString = "?";
  Object.entries(query).map(([key, value], i) => {
    if (queryString == "?") {
      queryString = queryString + `${key}=${value}`;
    } else {
      queryString = queryString + `&${key}=${value}`;
    }
  });
  return base + queryString;
};

const filterOrAddIds = (id: number, mergeIds: number[]): [] | number[] => {
  if (mergeIds.length == 0) {
    return [id];
  } else if (mergeIds.includes(id)) {
    return mergeIds.filter((i) => i != id);
  }
  return [id, ...mergeIds];
};

/* mapping color names from macrostrat to hex codes */
const colorMap: { [name: string]: string } = {
  blue: "#0000FF",
  [`blue dark`]: "#00008B",
  [`blue green`]: "#008B8B",
  black: "#000000",
  yellow: "#FFFF00",
  orange: "#FFA500",
  [`brown dark`]: "#A52A2A",
  [`brown light`]: "#DEB887",
  tan: "#D2B48C",
  [`green dark`]: "#006400",
  [`green light`]: "#90EE90",
  [`gray dark`]: "#A9A9A9",
  [`gray light`]: "#D3D3D3",
  pink: "#FFC0CB",
  purple: "#800080",
  red: "#FF0000",
  gray: "#808080",
  green: "#008000",
  brown: "#D2691E",
  [`steel blue`]: "#B0C4DE",
  white: "#FFFFFF",
};

const convertColorNameToHex = (name: string): string => {
  if (name[0] === "#") return name;
  return colorMap[name] ?? "#ffffff";
};

export {
  detectDeletionsAndAdditions,
  createLink,
  filterOrAddIds,
  convertColorNameToHex,
};
