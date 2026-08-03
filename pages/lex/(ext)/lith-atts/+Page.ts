import h from "@macrostrat/hyper";
import { Tag, Identifier } from "@macrostrat/data-components";
import { useData } from "vike-react/useData";
import {
  Hierarchy,
  MacrostratHierarchyItem,
} from "@macrostrat-web/lithology-hierarchy";

/** LithAttHierarchyItem */
function LithAttHierarchyItem({ data }) {
  const href = "/lex/lith-atts/" + data.lith_att_id;
  return h(Tag, {
    name: data.name,
    color: data.color,
    href,
    details: h(Identifier, { id: data.lith_att_id }),
  });
}

export function Page() {
  const { data } = useData();

  return h(Hierarchy, {
    data,
    itemComponent: MacrostratHierarchyItem,
  });
}
