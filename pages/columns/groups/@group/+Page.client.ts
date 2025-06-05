import { IndividualPage } from "../../../lex/index";
import { useData } from "vike-react/useData";

export function Page() {
  const { res, fossilRes, colData, taxaData } = useData();

  return IndividualPage(
    res[0].col_group_id,
    "groups",
    res,
    fossilRes,
    colData,
    taxaData
  );
}
