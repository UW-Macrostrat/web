import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage, ConceptInfo, LexItemBodyClient } from "~/components/lex";
import { LinkCard } from "~/components/cards";
import { fetchAPIData } from "~/_utils";
import { useEffect, useState } from "react";
import { LexItemData } from "~/components/lex/data-loaders.ts";

export function Page() {
  const { resData, id, type, config } = useData<LexItemData>();

  const relatedHref =
    config.idParam +
    "=" +
    id +
    "&color=" +
    resData?.color +
    "&name=" +
    resData?.name;

  // Title + Concept badge come from `+pageInfo.ts` via the layout header.
  return h(LexItemPage, { id, resData, siftLink: config.siftLink }, [
    h(ConceptInfo, { concept_id: resData?.concept_id, showHeader: false }),
    h(ConceptBody, { concept_id: id }),
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

function ConceptBody({ concept_id }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!concept_id) return; // Avoid calling API with undefined/null ID

    fetchAPIData(`/defs/strat_names`, { concept_id })
      .then((response) => {
        setData(response);
      })
      .catch((error) => {
        console.error("Error fetching strat names:", error);
        setData(null);
      });
  }, [concept_id]);

  if (!data) return null;

  return h("div.concept-body", [
    h("h2.strat-names", "Usages"),
    h(
      "ul.strat-name-list",
      data.map((strat) =>
        h(
          LinkCard,
          {
            href: "/lex/strat-names/" + strat.strat_name_id,
            className: "strat-name",
          },
          strat.strat_name_long + " (" + strat.t_units + ")"
        )
      )
    ),
  ]);
}
