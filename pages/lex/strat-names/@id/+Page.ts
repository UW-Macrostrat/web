import { useData } from "vike-react/useData";
import { LexItemPage } from "~/components/lex";

export function Page() {
  const { resData, colData, taxaData, refs } = useData();

  return LexItemPage({
    id: resData.strat_name_id,
    header: "strat_names",
    resData,
    colData,
    taxaData,
    refs,
  });
}
