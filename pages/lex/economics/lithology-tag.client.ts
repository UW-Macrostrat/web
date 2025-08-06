import h from "@macrostrat/hyper";
import { LithologyTag } from "@macrostrat/data-components";

export function LithologyTagInner({ data, href }) {
  return h(
    LithologyTag,
    {
      href,
      data
    },
  );
}