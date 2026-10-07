import React, { useState } from "react";
import hyper from "@macrostrat/hyper";
import { Button, Collapse, Icon, Switch } from "@blueprintjs/core";
import { useAppActions } from "#/map/map-interface/app-state";
import { useAdmoinshments } from "./admonishments";
import { FilterItemTag } from "../search-tags";
import styles from "./filters.module.styl";

const h = hyper.styled(styles);

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

  const { category, type } = filter;

  const isTypeAll: boolean = type.substr(0, 4) === "all_";
  const label: string = isTypeAll ? "All matches" : "Best matches";

  return h("div.filter-tag", [
    h(FilterItemTag, { filter }),
    h("span.spacer"),
    h.if(category == "lithology")(Switch, {
      style: { margin: 0 },
      alignIndicator: "right",
      label,
      checked: isTypeAll,
      onChange: swapFilterType,
    }),
    h(Button, {
      minimal: true,
      small: true,
      icon: "cross",
      title: "Remove filter",
      onClick: remove,
    }),
  ]);
}

function FiltersView({ filters }) {
  return h(
    "div.filter-container",
    filters.map((filter) => h(Filter, { key: filterKey(filter), filter }))
  );
}

function filterKey(filter) {
  return `${filter.type}:${filter.id}`;
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

function FilterPanel({ filters, admonishments }) {
  const [open, setOpen] = useState(false);

  const runAction = useAppActions();

  if (filters.length == 0 && admonishments.length == 0) {
    return null;
  }

  const filterString = makeFilterString(filters);

  const onClick = () => {
    setOpen(!open);
  };
  const onRemoveAll = () => {
    runAction({ type: "clear-filters" });
  };

  let iconName = "chevron-down";
  if (open) iconName = "chevron-up";

  return h([
    h(Admonishments, { admonishments }),
    h.if(filters.length > 0)("div.filters", [
      h("div.filter-summary", { title: filterString }, [
        h(Icon, { icon: "filter", size: 12, className: "filter-icon" }),
        h(
          "div.filter-tags",
          filters.map((filter) =>
            h(FilterItemTag, { key: filterKey(filter), filter, compact: true })
          )
        ),
        h(Button, {
          minimal: true,
          small: true,
          icon: "cross",
          title: "Clear all filters",
          onClick: onRemoveAll,
        }),
        h(Button, {
          minimal: true,
          small: true,
          icon: iconName,
          title: "Filter options",
          onClick,
        }),
      ]),
      h(Collapse, { isOpen: open }, [h(FiltersView, { filters })]),
    ]),
  ]);
}

function Admonishments({
  admonishments,
}: {
  admonishments: React.ReactNode[];
}) {
  if (admonishments.length == 0) {
    return null;
  }

  return h("div.admonishments", admonishments);
}

export { FilterPanel, useAdmoinshments };
