import { ClientOnly } from "vike-react/ClientOnly";
import h from "@macrostrat/hyper"

export function LithologyTag(props) {
  return h(
    ClientOnly,
    {
      load: () => import("~/components/lex/load.client").then((d) => d.LithologyTagInner),
      deps: [props.data, props.href],
    },
    (component) => h(component, props)
  );
}

export function FlexRow(props) {
  return h(
    ClientOnly,
    {
      load: () => import("~/components/lex/load.client").then((d) => d.FlexRowInner),
      deps: [props],
    },
    (component) => h(component, props)
  );
}

export function ExpansionPanel(props) {
  return h(
    ClientOnly,
    {
      load: () => import("~/components/lex/load.client").then((d) => d.ExpansionPanelInner),
      deps: [props],
    },
    (component) => h(component, props)
  );
}

export function DataField(props) {
  return h(
    ClientOnly,
    {
      load: () => import("~/components/lex/load.client").then((d) => d.DataFieldInner),
      deps: [props],
    },
    (component) => h(component, props)
  );
}