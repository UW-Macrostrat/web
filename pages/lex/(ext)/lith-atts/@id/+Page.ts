import h from "@macrostrat/hyper";
import { LexItemPage } from "~/components/lex";
import { useLexItemData } from "~/components/lex/data-loaders.ts";

export function Page() {
  const { resData, id } = useLexItemData();

  const children = [h(LithologyAttributeDetails, { resData })];

  return h(
    LexItemPage,
    {
      id,
      refs: [],
      resData,
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
