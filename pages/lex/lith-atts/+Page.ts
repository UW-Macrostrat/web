import h from "@macrostrat/hyper";
import { Tag } from "@macrostrat/data-components";
import { Identifier } from "~/components";
import { useData } from "vike-react/useData";
import { Hierarchy } from "@macrostrat-web/lithology-hierarchy";

/** LithAttHierarchyItem */
function LithAttHierarchyItem({ data }) {
  const href = "/lex/lith-atts/" + data.lith_att_id;
  return h(Tag, {
    name: data.name,
    color: data.color,
    href,
    details: h(Identifier, { identifier: data.lith_att_id }),
  });
}

export function Page() {
  const { data } = useData();

  return h(Hierarchy, {
    data,
    itemComponent: LithAttHierarchyItem,
  });
}
