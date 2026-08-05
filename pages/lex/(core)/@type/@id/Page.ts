import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage, LexItemBodyClient } from "~/components/lex";
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

  return h(LexItemPage, { id, resData, siftLink: config.siftLink }, [
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
