import h from "@macrostrat/hyper";
import { useState, useEffect, Suspense, lazy } from "react";

export function ClientOnly(props) {
  const [Component, setComponent] = useState(() => props.fallback);

  useEffect(() => {
    setComponent(() => lazy(props.component));
  }, []);

  return h(Suspense, { fallback: props.fallback }, h(Component));
}
