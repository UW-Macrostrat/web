import h from "@macrostrat/hyper";
import { Tag, Card } from "@blueprintjs/core";
import { useFilterState, useAppActions } from "../reducers";

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
  return h.if(shouldFiltersBeOpen)("div.filter-container", [
    filters.map((filter, key) => h(Filter, { key, filter })),
  ]);
}

export default Filters;
