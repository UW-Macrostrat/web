import { useData } from "vike-react/useData";
import { IndividualPage } from "~/components/lex/index";

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
