import h from "@macrostrat/hyper";
import { LithologyTag } from "@macrostrat/data-components";
import { FlexRow } from "@macrostrat/ui-components";

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