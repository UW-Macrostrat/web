import { useData } from "vike-react/useData";
import h from "./main.module.sass";
import { LexItemPage } from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";
import { DataField } from "~/components/unit-details";
import { LithologyTag } from "@macrostrat/data-components";
import { fetchAPIData } from "~/_utils";
import { useEffect, useState } from "react";
import { Measurement } from "../+Page.client";

export function Page() {
  const { resData } = useData();

  const id = usePageContext().urlParsed.pathname.split("/")[3];

  const children = [h(Measurement, { data: resData })];

  return LexItemPage({
    children,
    id,
    refs: [],
    resData,
    siftLink: "mineral",
    header: h("div.strat-header", [h("h1.strat-title", resData?.mineral)]),
  });
}

function SelectedMeasurement({ resData }) {
    const [lithData, setLithData] = useState(null);
    const [intervalData, setIntervalData] = useState(null);

    const { sample_name, sample_geo_unit, sample_lith, lith_id, age, early_id, id, sample_description, ref, type } = resData;

    // Lithology tag component
    useEffect(() => {
        if (lith_id !== 0) {
            fetchAPIData("/defs/lithologies", { lith_id })
                .then(data => setLithData(data[0]))
        }
    }, [lith_id]);

    let lithProps = {
        data: { name: sample_lith, color: lithData?.color || "#868aa2" }
    };

    if (lith_id !== 0) {
        lithProps.onClick = () => { window.open('/lex/lithologies/' + lith_id); };
    }

    // Interval tag component
    useEffect(() => {
        if (age) {
            fetchAPIData("/defs/intervals", { name_like: age })
                .then(data => setIntervalData(data[0]))
        }
    }, [age]);

    let ageProps = {
        data: { name: age, color: intervalData?.color || "#868aa2" }
    };

    if (intervalData) {
        ageProps.onClick = () => { window.open('/lex/intervals/' + intervalData.int_id); };
    }

    return h("div.selected-measurement", [
        h(DataField, { label: "Name", value: h('a.ref', { href: '/lex/measurements/' + id, target: "_blank" }, sample_name) }),
        h(DataField, { label: "Type", value: type }),
        h(DataField, { label: "Geological Unit", value: sample_geo_unit }),
        h.if(sample_lith)(DataField, { label: "Lithology", value: h(LithologyTag, lithProps) }),
        h.if(age)(DataField, { label: "Age", value: h(LithologyTag, ageProps) }),
        h(DataField, { label: "Description", value: sample_description }),
        h.if(ref.includes("http"))('a.ref', { href: ref, target: "_blank" }, "View Reference"),
    ]);
}