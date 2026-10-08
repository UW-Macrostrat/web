import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { ConceptInfo, LexItemBodyClient } from "~/components/lex";
import { LexHybridItemPage } from "~/components/lex/hybrid-item-page";
import { LexMapPlacement } from "~/components/lex/item-slots";
import { StratNameCards } from "~/components/lex/relation-cards";
import { LexItemData } from "~/components/lex/data-loaders.ts";

interface ConceptPageData extends LexItemData {
  usages: any[];
}

export function Page() {
  const { resData, id, type, config, usages } = useData<ConceptPageData>();

  const relatedHref =
    config.idParam +
    "=" +
    id +
    "&color=" +
    resData?.color +
    "&name=" +
    resData?.name;

  // Title + Concept badge come from `+pageInfo.ts` via the layout header.
  //
  // Same shape as the name page, in the same order: the relation cards (there,
  // the one concept; here, the names it groups), the concept's description,
  // then the map / columns / charts body. No "Names" heading above the cards —
  // each card says what it links to.
  const mapUrl = type + "=" + id;

  return h(
    LexHybridItemPage,
    { id, resData, siftLink: config.siftLink, mapUrl },
    [
      // Beside the name cards and description, above the full-width cards
      h(LexMapPlacement),
      h(StratNameCards, { usages }),
      h(ConceptInfo, { concept_id: resData?.concept_id }),
      h(LexItemBodyClient, {
        type,
        id,
        resData,
        mapUrl,
        relatedHref,
        showUnits: true,
        showMaps: true,
        showFossils: true,
        showColumnList: true,
      unitQuery: { strat_name_concept_id: id },
      }),
    ]
  );
}
