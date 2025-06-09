import { useData } from "vike-react/useData";
import { LexItemPage } from "~/components/lex";

export function Page() {
  const { resData, colData, taxaData, refs } = useData();

  return LexItemPage({
    id: resData.econ_id,
    header: "econs",
    resData,
    colData,
    taxaData,
    refs
  });
}
