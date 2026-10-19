import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage, FossilsCard, Timescales } from "~/components/lex";
import { ColumnsTable } from "~/components/lex/columns-card";

export function Page() {
  const { resData, colData, taxaData, refs } = useData();

  const id = resData.col_group_id;
  const timescales = resData?.timescales || [];

  const children = [
    // The Columns card includes the lithology / environment / economic breakdown
    h(ColumnsTable, {
      resData,
      colData,
    }),
    h(FossilsCard, { colData, taxaData }),
    h(Timescales, { timescales }),
  ];

  return LexItemPage({ children, id, refs, resData, siftLink: "groups" });
}
