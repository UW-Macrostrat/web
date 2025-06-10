import { useData } from "vike-react/useData";
import { LexItemPage } from "~/components/lex";

export function Page() {
  const { resData, colData, taxaData, refs } = useData();

  return LexItemPage({
    id: resData.concept_id,
    header: "strat_name_concepts",
    resData,
    colData,
    taxaData,
    refs,
  });
}
