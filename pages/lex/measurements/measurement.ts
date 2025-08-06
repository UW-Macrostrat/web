import h from "./main.module.sass";

import { LithologyTag } from "@macrostrat/data-components";
import { Divider, Icon } from "@blueprintjs/core";
import { DataField } from "~/components/unit-details";
import { FlexRow } from "@macrostrat/ui-components";


export function Measurement({data, setSelectedMeasurement}) {
    const { sample_name, sample_geo_unit, sample_lith, lith_id, lith_color, int_name, int_id, int_color, sample_description, ref, type, id } = data;

    // Lithology tag component
    let lithProps = {
        data: { name: sample_lith, color: lith_color }
    };

    if (lith_id !== 0) {
        lithProps.href = '/lex/lithologies/' + lith_id
    }

    // Interval tag component
    let ageProps = {
        data: { name: int_name, color: int_color }
    };

    if (int_id !== 0) {
        ageProps.href = '/lex/intervals/' + int_id;
    }

    let topRows = null;
    
    if (setSelectedMeasurement) {
        topRows = [
            h(FlexRow, { justifyContent: 'space-between' }, [ 
                h("h3", "Selected Measurement"),
                h(Icon, { icon: "cross", className: 'close-btn', onClick: () => setSelectedMeasurement(null) }),
            ]),
            h(Divider),
            h(DataField, { label: "Name", value: h('a.ref', { href: '/lex/measurements/' + id, target: "_blank" }, sample_name) }),
        ];
    }

    return h("div.selected-measurement", [
        topRows,
        h(DataField, { label: "Type", value: type }),
        h(DataField, { label: "Geological Unit", value: sample_geo_unit }),
        h.if(sample_lith)(DataField, { label: "Lithology", value: h(LithologyTag, lithProps) }),
        h.if(int_id)(DataField, { label: "Age", value: h(LithologyTag, ageProps) }),
        h(DataField, { label: "Description", value: sample_description }),
        h.if(ref.includes("http"))('a.ref', { href: ref, target: "_blank" }, "View Reference"),
    ]);
}