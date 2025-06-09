import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage, ConceptInfo } from "~/components/lex";

export function Page() {
  const { resData, refs } = useData();

  const id = resData.concept_id;

  const children = [h(ConceptInfo, { concept_id: id, showHeader: false })];

  return LexItemPage({
    children,
    id,
    refs,
    resData,
    siftLink: "strat_name_concept",
  });
}
