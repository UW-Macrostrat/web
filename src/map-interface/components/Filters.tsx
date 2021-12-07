import React from "react";
import h from "@macrostrat/hyper";
import { Tag, Card } from "@blueprintjs/core";
import { useDispatch } from "react-redux";
import { useFilterState } from "../reducers";

function Filter({ filter }) {
  const dispatch = useDispatch();
  const remove = () => dispatch({ type: "remove-filter", filter });
  const { name } = filter;
  return h("div", [
    h(Tag, { round: true, onRemove: remove, large: true, interactive: true }, [
      name,
    ]),
  ]);
}

function Filters() {
  const { filters } = useFilterState();
  const shouldFiltersBeOpen = filters.length > 0;
  return h.if(shouldFiltersBeOpen)(Card, [
    filters.map((filter, key) => h(Filter, { key, filter })),
  ]);
}

export default Filters;
