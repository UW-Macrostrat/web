import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage, TextExtractions } from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData } = useData();

  const id = usePageContext().urlParsed.pathname.split("/")[3];

  const children = [
    h(LithologyAttributeDetails, { resData }),
    h(TextExtractions, { lith_att_id: id})
  ];

  return LexItemPage({ children, id, refs: [], resData, siftLink: "lithology-attribute" });
}

function LithologyAttributeDetails({ resData }) {
  const { type, t_units } = resData;

  return h("div", { class: "lith-att-details" }, [
    h("p", `Type: ${type}`),
    h("p", `Type Units: ${t_units}`),
  ]);
}
