import h from "@macrostrat/hyper";
import {
  IntervalCell,
  ExpandedLithologies,
  PostgRESTTableView as _TableViewBase,
} from "@macrostrat/data-sheet2";
import { LithologyTag } from "~/components";
import { postgrestPrefix } from "@macrostrat-web/settings";

export { IntervalCell, ExpandedLithologies };

export function PostgRESTTableView(props) {
  return h(_TableViewBase, {
    endpoint: postgrestPrefix,
    ...props,
  });
}

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
