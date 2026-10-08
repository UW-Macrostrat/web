import h from "@macrostrat/hyper";
import { LexHybridItemPage } from "~/components/lex/hybrid-item-page";
import { useLexItemData } from "~/components/lex/data-loaders.ts";

export function Page() {
  const { resData, id } = useLexItemData();

  const children = [h(LithologyAttributeDetails, { resData })];

  return h(
    LexHybridItemPage,
    {
      id,
      refs: [],
      resData,
      // Nothing to map: a details view alone
      hasMap: false,
    },
    children
  );
}

function LithologyAttributeDetails({ resData }) {
  const { type, t_units } = resData ?? {};

  return h("div", { class: "lith-att-details" }, [
    h("p", `Type: ${type}`),
    h("p", `Type Units: ${t_units}`),
  ]);
}
