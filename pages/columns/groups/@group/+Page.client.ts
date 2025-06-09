import { useData } "vike-react/useData";
import { LexItemPage } from "~/components/lex/index";

export function Page() {
  const { res, fossilRes, colData, taxaData } = useData();

  return LexItemPage({
    id: res[0].col_group_id,
    header: "groups",
    res,
    fossilRes,
    colData,
    taxaData
  });
}
