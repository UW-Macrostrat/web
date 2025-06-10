import { useData } from "vike-react/useData";
import { LexItemPage } from "~/components/lex";

export function Page() {
  const { resData, colData, taxaData, refs } = useData();

  return LexItemPage({
    id: resData.int_id,
    header: "intervals",
    resData,
    colData,
    taxaData,
    refs,
  });
}
