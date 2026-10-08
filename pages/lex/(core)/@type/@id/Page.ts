import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemBodyClient } from "~/components/lex";
import { LexHybridItemPage } from "~/components/lex/hybrid-item-page";
import { LexMapPlacement } from "~/components/lex/item-slots";
import { LexItemHierarchy } from "~/components/lex/hierarchy";
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

  const mapUrl = type + "=" + id;

  return h(
    LexHybridItemPage,
    { id, resData, siftLink: config.siftLink, mapUrl },
    [
      // Beside the hierarchy, above the full-width cards
      h(LexMapPlacement),
      h(LexItemBodyClient, {
        type,
        id,
        resData,
        mapUrl,
        relatedHref,
        showUnits: true,
        showMaps: true,
        showFossils: true,
        // Hierarchy navigation (lithologies / economics / environments) sits above
        // the body, where intervals put their age scale and strat names their
        // hierarchy. Renders nothing for types without one. It rides in the body's
        // client-only island rather than mounting a second one — the tree is
        // navigation chrome built from a client-cached definition list.
        topExtra: h(LexItemHierarchy, { type, id, resData }),
      }),
    ]
  );
}
