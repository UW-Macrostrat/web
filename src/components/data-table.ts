import h from "@macrostrat/hyper";
import { IntervalCell, ExpandedLithologies } from "@macrostrat/data-sheet2";
import { LithologyTag } from "~/components";

export { IntervalCell, ExpandedLithologies };

export function LongTextViewer({ value, onChange }) {
  return h("div.long-text", value);
}

export function lithologyRenderer(value) {
  return h("span.liths", [
    addJoiner(value?.map((d) => h(LithologyTag, { data: d }))),
  ]);
}

function addJoiner(arr) {
  return arr?.reduce((acc, curr) => [acc, " ", curr]);
}
