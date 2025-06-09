import { useData } from "vike-react/useData";
import { LexItemPage } from "~/components/lex";

export function Page() {
  const { res, fossilRes, colData, taxaData } = useData();

  console.log("Strat Name Concepts Page", res, fossilRes, colData, taxaData);

  return LexItemPage({
    id: res[0].strat_name_id,
    header: "strat_names",
    res,
    fossilRes,
    colData,
    taxaData
  });
}
