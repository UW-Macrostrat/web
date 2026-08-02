import h from "@macrostrat/hyper";
import { Identifier } from "~/components";
import { useData } from "vike-react/useData";
import { Hierarchy } from "@macrostrat-web/lithology-hierarchy";
import { Tag } from "@macrostrat/data-components";

import type { Data } from "./+data.ts";

interface StructureItem {
  name: string;
  structure_id: number;
  class: string;
  group: string | null;
  type: string;
}

function StructureItemComponent({ data }: { data: StructureItem }) {
  return h(Tag, {
    className: "structure-item",
    href: "/lex/structures/" + data.structure_id,
    name: data.name,
    details: h(Identifier, { identifier: data.structure_id }),
  });
}

export function Page() {
  const { structuresTree } = useData<Data>();
  return h(Hierarchy, {
    data: structuresTree,
    itemComponent: StructureItemComponent,
  });
}
