import { useState } from "react";
import h from "@macrostrat/hyper";
import { Tag, Card, Button, Collapse, Switch, Icon } from "@blueprintjs/core";
import { useFilterState, useAppActions } from "~/map-interface/app-state";

function Filter({ filter }) {
  const runAction = useAppActions();
  const remove = () => runAction({ type: "remove-filter", filter });

  const swapFilterType = () => {
    // Copy the filter, otherwise all hell breaks loose
    let newFilter = JSON.parse(JSON.stringify(filter));

    // Swap the style of filter
    if (newFilter.type.substr(0, 4) === "all_") {
      newFilter.type = newFilter.type.replace("all_", "");
    } else {
      newFilter.type = `all_${newFilter.type}`;
    }
    runAction({ type: "async-add-filter", filter: newFilter });
  };

  const { name, category, type } = filter;

  const isTypeAll: boolean = type.substr(0, 4) === "all_";
  const label: string = isTypeAll ? "All matches" : "Best matches";

  return h("div.filter-tag", [
    h(
      Tag,
      {
        onRemove: remove,
        interactive: true,
        style: { backgroundColor: "#D9822B" },
      },
      [name]
    ),
    h.if(category == "lithology")(Switch, {
      style: { margin: 0 },
      alignIndicator: "right",
      label,
      checked: isTypeAll,
      onChange: swapFilterType,
    }),
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
  const runAction = useAppActions();

  if (filters.length == 0) {
    return null;
  }

  const filterString = makeFilterString(filters);

  const onClick = () => {
    setOpen(!open);
  };
  const onRemoveAll = () => {
    runAction({ type: "clear-filters" });
  };

  const iconName = open ? "chevron-up" : "chevron-down";

  return h(Card, { className: "filter-tongue" }, [
    h("div.filter-name-container", [
      h("p.filter-names", [h("b", "Filtering by: "), filterString]),
      h("div.filter-tongue-actions", [
        h("div.remove", { onClick: onRemoveAll }, ["remove all"]),
        h(Button, { minimal: true, icon: iconName, onClick }),
      ]),
    ]),
    h(Collapse, { isOpen: open }, [h(Filters)]),
  ]);
}

export default Filters;
export { SubtleFilterText };
