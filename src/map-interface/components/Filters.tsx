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

function SubtleFilterText() {
  const [open, setOpen] = useState(false);
  const { filters } = useFilterState();

  if (filters.length == 0) {
    return h("div");
  }

  const filterNames = filters.map((f) => f.name).join(", ");

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
      h("p.filter-names", [h("b", "Filtering by: "), filterNames]),
      h(Button, { minimal: true, icon: iconName, onClick }),
    ]),
    h(Collapse, { isOpen: open }, [h(Filters)]),
  ]);
}

export default Filters;
export { SubtleFilterText };
