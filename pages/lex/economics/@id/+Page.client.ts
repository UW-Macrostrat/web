import { IndividualPage } from "../../index";
import { useData } from "vike-react/useData";

export function Page() {
  const { res, fossilRes, colData, taxaData } = useData();
  console.log("Page data:", res, fossilRes, colData, taxaData);

  return IndividualPage(res[0].econ_id, "econs", res, fossilRes, colData, taxaData);
}
