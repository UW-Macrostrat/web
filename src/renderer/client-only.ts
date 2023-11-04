import h from "@macrostrat/hyper";
import { useState, useEffect, Suspense, useMemo } from "react";
import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";

function ClientOnly(props) {
  const fallback = props.fallback || Spinner;
  const [Component, setComponent] = useState(null);
  const rest = useMemo(() => {
    const { fallback, component, ...r } = props;
    return r;
  }, [props]);

  useEffect(() => {
    setComponent(() => loadable(props.component));
  }, []);

  const element = Component == null ? h(fallback) : h(Component, rest);

  return h(Suspense, { fallback: fallback }, element);
}

export { ClientOnly };
