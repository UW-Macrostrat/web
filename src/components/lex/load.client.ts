import h from "@macrostrat/hyper";
import { LithologyTag, DataField } from "@macrostrat/data-components";
import { FlexRow } from "@macrostrat/ui-components";
import { ExpansionPanel } from "@macrostrat/map-interface";

export function LithologyTagInner({ data, href }) {
  return h(
    LithologyTag,
    {
      href,
      data
    },
  );
}

export function FlexRowInner(props) {
  return h(FlexRow, props);
}

export function ExpansionPanelInner(props) {
  return h(ExpansionPanel, props);
}

export function DataFieldInner(props) {
  return h(DataField, props);
}