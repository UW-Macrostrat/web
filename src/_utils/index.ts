import h from "@macrostrat/hyper";

import { Suspense } from "react";
import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";

export function onDemand(func) {
  const _Component = loadable(func);
  return (props) => h(Suspense, { fallback: h(Spinner) }, h(_Component, props));
}

export function loadableElement(func, props = null) {
  const _Component = onDemand(func);
  return h(_Component, props);
}

export function resolvePattern(name: string | number) {
  return `//visualization-assets.s3.amazonaws.com/geologic-patterns/svg/${name}.svg`;
}

export * from "./map-layers";
