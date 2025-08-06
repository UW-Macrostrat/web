import { ClientOnly } from "vike-react/ClientOnly";
import h from "@macrostrat/hyper"

export function LithologyTag(props) {
  return h(
    ClientOnly,
    {
      load: () => import("~/components/lex/lithology-tag.client").then((d) => d.LithologyTagInner),
      deps: [props.data, props.href],
    },
    (component) => h(component, props)
  );
}