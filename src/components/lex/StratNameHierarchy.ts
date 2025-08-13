import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { Hierarchy } from "@macrostrat/data-components";
import { useState } from "react";

export function StratNameHierarchy({ id }) {
  const data = fetchStratNames({ id });
  if (data == null) return h("div", "Loading...");

  return h(Hierarchy, { ...data });
}

var rankMap = {
  SGp: null,
  Gp: "sgp",
  SubGp: "gp",
  Fm: "subgp",
  Mbr: "fm",
  Bed: "mbr",
  1: null,
  2: "sgp",
  3: "gp",
  4: "subgp",
  5: "fm",
  6: "mbr",
};
var rankMapOrder = { SGp: 1, Gp: 2, SubGp: 3, Fm: 4, Mbr: 5, Bed: 6 };

function fetchStratNames({ id }) {
  const urlBase = "https://macrostrat.org/api/v2/defs";
  const url = urlBase + "/strat_names?rule=all&strat_name_id=" + id;

  // function to fetch stratnames and orgnize hierarchy
  const data = useAPIResult(url)?.success?.data;

  if (data == null) return null;

  data.forEach((d) => {
    // Figure out if this is the target name or not
    d.active = false;
    if (d.strat_name_id == id) {
      d.active = true;
    }

    d.children = [];
    d.totalChildren =
      data.filter((j) => {
        if (j[d.rank.toLowerCase() + "_id"] == d.strat_name_id) {
          return j;
        }
      }).length - 1;
    d.total = d.totalChildren;
  });

  data.forEach((d) => {
    var belongsTo = d[rankMap[d.rank] + "_id"];

    // Need to make sure belongsTo doesn't = 0 when it shouldn't (ex: strat_name_id=9574)
    var previousRank = 1;
    while (belongsTo === 0) {
      belongsTo = d[rankMap[rankMapOrder[d.rank] - previousRank] + "_id"];
      previousRank--;
    }

    // Find the one it belongs to and add it
    data.forEach((j) => {
      if (j.strat_name_id == belongsTo && j.strat_name_id != d.strat_name_id) {
        j.children.push(d);
      }
    });
  });

  const hierarchy = data.sort((a, b) => {
    return b.totalChildren - a.totalChildren;
  })[0];

  const mappedData = mapToHier(hierarchy);
  // Find the top of the hierarchy and return it
  return mappedData;
}

const mapToHier = (data) => {
  const Hier = {};
  Hier.name = data.strat_name_long;
  Hier.units = data.t_units;
  Hier.active = data.active;
  Hier.onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `/lex/strat-names/${data.strat_name_id}`;
    window?.open(url, "_self")?.focus();
  };
  Hier.subhierarchy = data.children.map((c) => mapToHier(c));
  return Hier;
};
