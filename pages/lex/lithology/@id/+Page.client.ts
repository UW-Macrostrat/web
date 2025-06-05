import { IndividualPage } from "../../index";
import { useData } from "vike-react/useData";

export function Page() {
  const { res, fossilRes, colData, taxaData } = useData();

  return IndividualPage(
    res[0].lith_id,
    "lithologies",
    res,
    fossilRes,
    colData,
    taxaData
  );
}
