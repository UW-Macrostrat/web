import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage, ConceptInfo, LexItemBodyClient } from "~/components/lex";
import { StratNameHierarchy } from "~/components/lex/strat-hierarchy";
import { ConceptRelationCard } from "~/components/lex/relation-cards";
import { LexItemData } from "~/components/lex/data-loaders.ts";

interface StratNamePageData extends LexItemData {
  concept: any;
}

export function Page() {
  const { resData, id, type, config, concept } = useData<StratNamePageData>();

  const relatedHref =
    config.idParam +
    "=" +
    id +
    "&color=" +
    resData?.color +
    "&name=" +
    resData?.name;

  // The title (and the Name/Concept badge) belong to the layout's page header,
  // built from `+pageInfo.ts` — not to a second heading here.
  //
  // Order: what the name belongs to (the concept card, then that concept's
  // description), then where it is (the map and the columns), then where it
  // sits (the hierarchy) — above the attribute charts, since the hierarchy is
  // the more important of the two on a stratigraphic page. The relation card
  // block sits in the same position here as on the concept page.
  return h(LexItemPage, { id, resData, siftLink: config.siftLink }, [
    h(ConceptRelationCard, { concept }),
    h(ConceptInfo, { concept_id: resData?.concept_id, record: concept }),
    h(LexItemBodyClient, {
      type,
      id,
      resData,
      mapUrl: type + "=" + id,
      relatedHref,
      showUnits: true,
      showMaps: true,
      showFossils: true,
      showColumnList: true,
      afterColumns: h(StratNameHierarchy, { id }),
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
