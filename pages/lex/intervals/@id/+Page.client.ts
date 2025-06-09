import { useData } from "vike-react/useData";
import { IndividualPage } from "~/components/lex";

export function Page() {
  const { res, fossilRes, colData, taxaData } = useData();

  return IndividualPage(
    res[0].int_id,
    "intervals",
    res,
    fossilRes,
    colData,
    taxaData
  );
}
