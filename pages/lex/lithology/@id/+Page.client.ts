import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import {
  LexItemPage,
  ColumnsTable,
  Charts,
  PrevalentTaxa,
  Timescales,
  Units,
  Fossils,
  Maps,
  Matches
} from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";
import { fetchPGData } from "~/_utils";
import { useState, useEffect } from "react";

export function Page() {
  const { resData, colData, taxaData, refs, unitsData, fossilsData, mapsData } =
    useData();

  const id = usePageContext().urlParsed.pathname.split("/")[3];
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  const children = [
    h(ColumnsTable, {
      resData,
      colData,
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h(Units, { unitsData }),
    h(Fossils, { fossilsData }),
    h(Maps, { mapsData }),
    h(Matches, {
      lith_id: id,
    })
  ];

  return LexItemPage({ children, id, refs, resData, siftLink: "lithology" });
}