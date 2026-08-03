import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage } from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData } = useData();

  const id = usePageContext().routeParams.id;

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
  const { group, structure_type } = resData;

  return h("div", { class: "structure-details" }, [
    h.if(group)("p", `Group: ${group}`),
    h("p", `Class: ${resData.class}`),
    h("p", `Structure Type: ${structure_type}`),
  ]);
}
