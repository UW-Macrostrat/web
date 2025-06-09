import { useData } from "vike-react/useData";
import { LexItemPage } from "~/components/lex";

export function Page() {
  const { res, fossilRes, colData, taxaData } = useData();

  return LexItemPage({
    id: res[0].int_id,
    header: "intervals",
    res,
    fossilRes,
    colData,
    taxaData
  });
}
