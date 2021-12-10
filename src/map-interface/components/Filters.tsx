import { useState } from "react";
import h from "@macrostrat/hyper";
import { Tag, Card, Button, Collapse } from "@blueprintjs/core";
import {
  useFilterState,
  useAppActions,
  useMenuState,
  MenuPanel,
} from "../reducers";

function Filter({ filter }) {
  const runAction = useAppActions();
  const remove = () => runAction({ type: "remove-filter", filter });
  const { name } = filter;
  return h("div.filter-tag", [
    h(Tag, { round: true, onRemove: remove, large: true, interactive: true }, [
      name,
    ]),
  ]);
}

function Filters() {
  const { filters } = useFilterState();
  const shouldFiltersBeOpen = filters.length > 0;
  return h("div.filter-container", [
    h.if(!shouldFiltersBeOpen)("div", [
      "No Filters. To add filters begin searching..",
    ]),
    h.if(shouldFiltersBeOpen)(
      filters.map((filter, key) => h(Filter, { key, filter }))
    ),
  ]);
}

function makeFilterString(filters) {
  const timeFilters = filters
    .filter((f) => f.category === "interval")
    .map((f) => f.name);

  const otherFilters = filters
    .filter((f) => f.category !== "interval")
    .map((f) => f.name);

  let otherFiltersString = otherFilters.join(" OR ");
  let timeFiltersString = timeFilters.join(" OR ");

  if (otherFilters.length > 1 && timeFilters.length > 0) {
    otherFiltersString = "(" + otherFiltersString + ")";
  }
  if (timeFilters.length > 1 && otherFilters.length > 0) {
    timeFiltersString = "(" + timeFiltersString + ")";
  }

  const finalString = [timeFiltersString, otherFiltersString]
    .filter((s) => s.length > 0)
    .join(" AND ");

  return finalString;
}

function SubtleFilterText() {
  const [open, setOpen] = useState(false);
  const { filters } = useFilterState();

  if (filters.length == 0) {
    return h("div");
  }

  const filterString = makeFilterString(filters);

  const onClick = () => {
    setOpen(!open);
  };

  const iconName = !open ? "chevron-right" : "chevron-down";

  const style = {
    backgroundColor: "#ffc8dcf0",
    padding: "5px",
    paddingBottom: "2px",
    margin: "5px",
    marginBottom: "7px",
    marginTop: "-9px",
  };
  return h(Card, { style }, [
    h("div.filter-name-container", [
      h("p.filter-names", [h("b", "Filtering by: "), filterString]),
      h(Button, { minimal: true, icon: iconName, onClick }),
    ]),
    h(Collapse, { isOpen: open }, [h(Filters)]),
  ]);
}

export default Filters;
export { SubtleFilterText };
