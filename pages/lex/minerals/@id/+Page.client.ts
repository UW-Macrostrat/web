import { useData } from "vike-react/useData";
import h from "./main.module.sass";
import { LexItemPage } from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData } = useData();

  const id = usePageContext().urlParsed.pathname.split("/")[3];

  const children = [h(MineralDetails, { resData })];

  return LexItemPage({
    children,
    id,
    refs: [],
    resData,
    siftLink: "mineral",
    header: h("div.strat-header", [h("h1.strat-title", resData?.mineral)]),
  });
}

function MineralDetails({ resData }) {
  const {
    mineral_type,
    formula,
    url,
    hardness_min,
    hardness_max,
    crystal_form,
    mineral_color,
    lustre,
  } = resData || {};

  return h("div.mineral-details", [
    h.if(mineral_type)("p.mineral-type", `Type: ${mineral_type}`),
    h("p.formula", `Formula: ${formula}`),
    h("p.hardness", `Hardness: ${hardness_min} - ${hardness_max}`),
    h("p.crystal-form", `Crystal Form: ${crystal_form}`),
    h("p.color", `Color: ${mineral_color}`),
    h("p.lustre", `Lustre: ${lustre}`),
    url
      ? h("a.mineral-url", { href: url, target: "_blank" }, "More Info")
      : null,
  ]);
}
