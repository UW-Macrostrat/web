import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import { LexItemPage, Units } from "~/components/lex";

export function Page() {
  const { resData, unitsData } = useData();

  console.log("Lithology Attribute Page", unitsData);

  const id = resData.lith_att_id;

  const children = [
    h(LithologyAttributeDetails, { resData }),
    h(Units, { unitsData }),
  ];

  return LexItemPage({ children, id, refs: [], resData, siftLink: "" });
}

function LithologyAttributeDetails({ resData }) {
  const { type, t_units } = resData;

  return h("div", { class: "lith-att-details" }, [
    h("p", `Type: ${type}`),
    h("p", `Type Units: ${t_units}`),
  ]);
}
