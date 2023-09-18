import h  from "@macrostrat/hyper";
import { useState, useEffect, Suspense } from "react";
import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";

function ClientOnly(props) {

  const fallback = props.fallback || Spinner;
  const [Component, setComponent] = useState(() => fallback);

  useEffect(() => {
    setComponent(() => loadable(props.component));
  }, []);

  return h(Suspense, { "fallback": fallback }, h(Component));
}

export { ClientOnly };