import h from "@macrostrat/hyper";
import { LexItemPage } from "~/components/lex";
import { useLexItemData } from "~/components/lex/data-loaders.ts";

export function Page() {
  const { resData, id } = useLexItemData();

  const children = [h(StructureDetails, { resData })];

  return h(LexItemPage, {
    children,
    id,
    refs: [],
    resData,
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
