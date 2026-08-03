import h from "@macrostrat/hyper";
import {
  Intervals,
  LexItemPage,
  Timescales,
  LexItemBodyClient,
} from "~/components/lex";
import { useLexItemData } from "~/components/lex/data-loaders.ts";

export function Page() {
  const { resData, type, id } = useLexItemData();
  const timescales = resData?.timescales || [];
  const relatedHref =
    "int_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name;

  return h(LexItemPage, { id, resData, siftLink: "interval" }, [
    h(Intervals, { resData }),
    h(Timescales, { timescales }),
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
