import { useData } from "vike-react/useData";
import h from "./main.module.sass";
import { LexItemPage, ConceptInfo, LexItemBodyClient } from "~/components/lex";
import { StratNameHierarchy } from "~/components/lex/StratNameHierarchy.ts";
import { StratTag } from "~/components/general";
import { LexItemData } from "~/components/lex/data-loaders.ts";

export function Page() {
  const { resData, id, type, config } = useData<LexItemData>();

  console.log(resData, id, type, config);

  const relatedHref =
    config.idParam +
    "=" +
    id +
    "&color=" +
    resData?.color +
    "&name=" +
    resData?.name;

  const { strat_name_long } = resData || {};

  return h(LexItemPage, { id, resData, siftLink: config.siftLink }, [
    h("div.strat-header", [
      h("h1.strat-title", strat_name_long),
      h(StratTag, { isConcept: false, fontSize: "1.6em" }),
    ]),
    h(StratNameHierarchy, { id }),
    h(ConceptInfo, { concept_id: resData?.concept_id, showHeader: true }),
    h(LexItemBodyClient, {
      type,
      id,
      resData,
      mapUrl: type + "=" + id,
      relatedHref,
      showUnits: true,
      showMaps: true,
      showFossils: true,
    }),
  ]);
}

// export function Page() {
//   const { resData, refs } = useData();
//   const id = usePageContext().routeParams.id;
//
//   const itemRef = { type: "strat-names", id: Number(id) };
//   const colData = useLexColumns(itemRef);
//   const fossilsData = useLexFossils(itemRef);
//   const taxaData = useLexTaxa(itemRef);
//   const unitsData = useLexUnits(itemRef);
//
//   const features = colData?.features || [];
//   const timescales = resData?.timescales || [];
//   const { strat_name_long } = resData || {};
//
//   const children = [
//     h(ColumnsTable, { resData, colData, fossilsData }),
//     h(Charts, { features }),
//     h(PrevalentTaxa, { taxaData }),
//     h(Timescales, { timescales }),
//     h.if(unitsData?.length > 0)(Units, {
//       href: "strat_name_id=" + id + "&name=" + resData?.strat_name,
//     }),
//     // h.if(mapsData?.length > 0)(Maps, ...) — add strat names to the legends view first
//     h.if(fossilsData?.features?.length > 0)(Fossils, {
//       href: "strat_name_id=" + id + "&name=" + resData?.name,
//     }),
//     h(StratNameHierarchy, { id }),
//     h(ConceptInfo, { concept_id: resData?.concept_id, showHeader: true }),
//   ];
//
//   return h(LexItemPage, {
//     children,
//     id,
//     refs,
//     resData,
//     siftLink: "strat-name",
//     header: h("div.strat-header", [
//       h("h1.strat-title", strat_name_long),
//       h(StratTag, { isConcept: false, fontSize: "1.6em" }),
//     ]),
//   });
// }
