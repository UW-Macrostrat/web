import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage } from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData } = useData();

  const id = usePageContext().routeParams.id;

  const children = [h(LithologyAttributeDetails, { resData })];

  return h(
    LexItemPage,
    {
      id,
      refs: [],
      resData,
      siftLink: "lithology-attribute",
    },
    children
  );
}

function LithologyAttributeDetails({ resData }) {
  const { type, t_units } = resData;

  return h("div", { class: "lith-att-details" }, [
    h("p", `Type: ${type}`),
    h("p", `Type Units: ${t_units}`),
  ]);
}
