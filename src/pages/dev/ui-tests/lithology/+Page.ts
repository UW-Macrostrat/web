import LithologyHierarchy from "@macrostrat-web/lithology-hierarchy";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import { PageBreadcrumbs } from "~/renderer";
import styles from "./main.module.sass";
import { useRef } from "react";
import { useElementSize } from "@macrostrat/ui-components";
const h = hyper.styled(styles);

export function Page() {
  return h(FullscreenPage, [
    h("div.main", [h(PageBreadcrumbs), h(HierarchyContainer)]),
  ]);
}

function HierarchyContainer() {
  const ref = useRef(null);
  const { width, height } = useElementSize(ref) ?? {};
  return h("div.flex-grow", { ref }, h(LithologyHierarchy, { width, height }));
}
