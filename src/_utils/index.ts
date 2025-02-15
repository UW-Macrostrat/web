import h from "@macrostrat/hyper";

import { Suspense } from "react";
import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";

export function onDemand(func) {
  // If we're on the server, return null
  if (typeof window === "undefined") {
    return () => null;
  }
  const _Component = loadable(func);
  return (props) => h(Suspense, { fallback: h(Spinner) }, h(_Component, props));
}

export function loadableElement(func, props = null) {
  const _Component = onDemand(func);
  return h(_Component, props);
}

export function resolvePattern(name: string | number) {
  return `/assets/geologic-patterns/svg/${name}.svg`;
}
