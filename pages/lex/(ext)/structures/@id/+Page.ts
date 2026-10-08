import h from "@macrostrat/hyper";
import { LexHybridItemPage } from "~/components/lex/hybrid-item-page";
import { useLexItemData } from "~/components/lex/data-loaders.ts";

export function Page() {
  const { resData, id } = useLexItemData();

  const children = [h(StructureDetails, { resData })];

  return h(LexHybridItemPage, {
    children,
    id,
    refs: [],
    resData,
    // Nothing to map: a details view alone
    hasMap: false,
    siftLink: "structure",
  });
}

function StructureDetails({ resData }) {
  const { group, structure_type, class: structureClass } = resData ?? {};

  return h("div", { class: "structure-details" }, [
    h.if(group)("p", `Group: ${group}`),
    h("p", `Class: ${structureClass}`),
    h("p", `Structure Type: ${structure_type}`),
  ]);
}
