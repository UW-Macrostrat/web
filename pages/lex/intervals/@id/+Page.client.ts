import { IndividualPage } from "../../index";
import { useData } from "vike-react/useData";

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
