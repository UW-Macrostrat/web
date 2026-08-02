import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage, LexItemBodyClient } from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData } = useData();

  const id = usePageContext().routeParams.id;

  const relatedHref =
    "environ_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name;

  return h(LexItemPage, { id, resData, siftLink: "environment" }, [
    h(LexItemBodyClient, {
      type: "environments",
      id,
      resData,
      mapURL: "environments=" + id,
      relatedHref,
      showUnits: true,
      showMaps: true,
      showFossils: true,
    }),
  ]);
}
