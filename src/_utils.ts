import h from "@macrostrat/hyper";

import { Suspense } from "react";
import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";

export function onDemand(func) {
  const _Component = loadable(func);
  return (props) => h(Suspense, { fallback: h(Spinner) }, h(_Component, props));
}
