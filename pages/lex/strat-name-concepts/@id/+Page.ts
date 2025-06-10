import { useData } from "vike-react/useData";
import h from "./main.module.sass";
import { LexItemPage, ConceptInfo } from "~/components/lex";
import { StratTag } from "~/components/general";

export function Page() {
  const { resData, refs } = useData();

  const id = resData.concept_id;

  const { name } = resData;

  const children = [h(ConceptInfo, { concept_id: id, showHeader: false })];

  return LexItemPage({
    children,
    id,
    refs,
    resData,
    siftLink: "strat_name_concept",
    header: h("div.concept-header", [
      h("h1.concept-title", name),
      h(StratTag, { isConcept: true, fontSize: "1.6em" }),
    ]),
  });
}
