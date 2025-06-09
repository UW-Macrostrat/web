import { useData } from "vike-react/useData";
import { IndividualPage } from "~/components/lex";

export function Page() {
  const { res, fossilRes, colData, taxaData } = useData();

  console.log("Strat Name Concepts Page", res, fossilRes, colData, taxaData);

  return IndividualPage(
    res[0].strat_name_id,
    "strat_names",
    res,
    fossilRes,
    colData,
    taxaData
  );
}
