import { useData } from "vike-react/useData";
import { LexItemPage } from "~/components/lex";

export function Page() {
  const { resData, colData, taxaData, refs } = useData();

  return LexItemPage({
    id: resData.col_group_id,
    header: "groups",
    resData,
    colData,
    taxaData,
    refs
  });
}
