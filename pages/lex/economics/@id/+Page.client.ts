import { useData } from "vike-react/useData";
import { IndividualPage } from "~/components/lex";

export function Page() {
  const { res, fossilRes, colData, taxaData } = useData();

  return IndividualPage(
    res[0].econ_id,
    "econs",
    res,
    fossilRes,
    colData,
    taxaData
  );
}
