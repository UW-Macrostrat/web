import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage, LexItemBodyClient } from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";

/**
 * SSR page: the descriptive core (name via breadcrumbs, references) renders on
 * the server; the heavy/derived block (map, charts, taxa, related links) loads
 * client-side through `LexItemBodyClient` (a `ClientOnly` island backed by the
 * loadable atoms). See [[Geologic lexicon pages]] (Layer B).
 */
export function Page() {
  const { resData } = useData();
  const id = usePageContext().routeParams.id;

  const relatedHref =
    "lith_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name;

  // refs render inside the client body now (see item-body / item-atoms), so the
  // server page renders just the frame + breadcrumb name.
  return h(
    LexItemPage,
    { id, resData, siftLink: "lithology" },
    h(LexItemBodyClient, {
      type: "lithologies",
      id,
      resData,
      mapUrl: "lithologies=" + id,
      relatedHref,
      showUnits: true,
      showMaps: true,
      showFossils: true,
    })
  );
}
